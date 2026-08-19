#![forbid(unsafe_code)]

use base64ct::{Base64, Encoding};
use serde_json::json;
use sha2::{Digest, Sha256};
use std::{
    env, fs, io,
    path::{Path, PathBuf},
};

mod release;

fn usage() -> ! {
    eprintln!(
        "usage: another-dimension-tools web-build --source DIR --output DIR\n  another-dimension-tools release-manifest create|verify ..."
    );
    std::process::exit(2);
}

fn value(args: &[String], name: &str) -> Result<PathBuf, String> {
    args.windows(2)
        .find(|pair| pair[0] == name)
        .map(|pair| PathBuf::from(&pair[1]))
        .filter(|path| !path.as_os_str().is_empty())
        .ok_or_else(|| format!("{name} requires a value"))
}

fn copy_file(source: &Path, target: &Path) -> io::Result<()> {
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent)?;
    }
    fs::copy(source, target)?;
    Ok(())
}

fn copy_tree(source: &Path, target: &Path) -> io::Result<()> {
    for entry in fs::read_dir(source)? {
        let entry = entry?;
        let from = entry.path();
        let to = target.join(entry.file_name());
        if entry.file_type()?.is_dir() {
            copy_tree(&from, &to)?;
        } else if entry.file_type()?.is_file() {
            copy_file(&from, &to)?;
        }
    }
    Ok(())
}

fn collect_files(root: &Path, current: &Path, output: &mut Vec<String>) -> io::Result<()> {
    for entry in fs::read_dir(current)? {
        let entry = entry?;
        let path = entry.path();
        if entry.file_type()?.is_dir() {
            collect_files(root, &path, output)?;
        } else if entry.file_type()?.is_file() {
            output.push(
                path.strip_prefix(root)
                    .map_err(|_| io::Error::other("asset escaped output"))?
                    .to_string_lossy()
                    .replace('\\', "/"),
            );
        }
    }
    Ok(())
}

fn integrity_manifest(root: &Path) -> Result<(), String> {
    let mut files = Vec::new();
    collect_files(root, root, &mut files).map_err(|error| error.to_string())?;
    files.sort();
    let mut assets = serde_json::Map::new();
    for relative in files {
        if relative == "asset-integrity.json" || relative.ends_with(".map") {
            continue;
        }
        let bytes = fs::read(root.join(&relative)).map_err(|error| error.to_string())?;
        let digest = Sha256::digest(&bytes);
        let mut encoded = vec![0u8; Base64::encoded_len(&digest)];
        let encoded = Base64::encode(&digest, &mut encoded)
            .map_err(|_| "could not encode asset digest".to_owned())?;
        assets.insert(
            format!("/{relative}"),
            json!({ "sha256": encoded, "bytes": bytes.len() }),
        );
    }
    let mut index =
        fs::read_to_string(root.join("index.html")).map_err(|error| error.to_string())?;
    for (attribute, asset) in [("href", "/assets/styles.css"), ("src", "/assets/main.js")] {
        let digest = assets
            .get(asset)
            .and_then(|value| value.get("sha256"))
            .and_then(serde_json::Value::as_str)
            .ok_or_else(|| format!("missing integrity entry for {asset}"))?;
        let needle = format!(r#"{attribute}="{asset}""#);
        let replacement =
            format!(r#"{attribute}="{asset}" integrity="sha256-{digest}" crossorigin="anonymous""#);
        index = index.replace(&needle, &replacement);
    }
    fs::write(root.join("index.html"), index).map_err(|error| error.to_string())?;
    let index_bytes = fs::read(root.join("index.html")).map_err(|error| error.to_string())?;
    let digest = Sha256::digest(&index_bytes);
    let mut encoded = vec![0u8; Base64::encoded_len(&digest)];
    let encoded = Base64::encode(&digest, &mut encoded)
        .map_err(|_| "could not encode index digest".to_owned())?;
    assets.insert(
        "/index.html".into(),
        json!({ "sha256": encoded, "bytes": index_bytes.len() }),
    );
    let manifest = json!({
        "format": "another-dimension-asset-integrity",
        "version": 1,
        "assets": assets,
    });
    fs::write(
        root.join("asset-integrity.json"),
        serde_json::to_vec_pretty(&manifest).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())
}

fn build_web(source: &Path, output: &Path) -> Result<(), String> {
    if !source.join("index.html").is_file() || !source.join("src/main.js").is_file() {
        return Err("web source must contain index.html and src/main.js".into());
    }
    if output.exists() {
        fs::remove_dir_all(output).map_err(|error| error.to_string())?;
    }
    fs::create_dir_all(output.join("assets")).map_err(|error| error.to_string())?;
    let mut index =
        fs::read_to_string(source.join("index.html")).map_err(|error| error.to_string())?;
    let script = r#"    <link rel="stylesheet" href="/assets/styles.css" />
    <script type="module" src="/assets/main.js"></script>"#;
    let script_start = index
        .find("<script type=\"module\"")
        .ok_or_else(|| "index.html has no module entry".to_owned())?;
    let script_end = index[script_start..]
        .find("</script>")
        .map(|offset| script_start + offset + "</script>".len())
        .ok_or_else(|| "index.html module entry is not closed".to_owned())?;
    index.replace_range(script_start..script_end, script);
    fs::write(output.join("index.html"), index).map_err(|error| error.to_string())?;
    for entry in fs::read_dir(source.join("src")).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        if !entry
            .file_type()
            .map_err(|error| error.to_string())?
            .is_file()
        {
            continue;
        }
        let name = entry.file_name();
        if name.to_string_lossy().ends_with(".test.js") {
            continue;
        }
        copy_file(&entry.path(), &output.join("assets").join(name))
            .map_err(|error| error.to_string())?;
    }
    if source.join("public").is_dir() {
        copy_tree(&source.join("public"), output).map_err(|error| error.to_string())?;
    }
    integrity_manifest(output)
}

fn main() {
    let args: Vec<_> = env::args().skip(1).collect();
    let result = match args.first().map(String::as_str) {
        Some("web-build") => match (value(&args, "--source"), value(&args, "--output")) {
            (Ok(source), Ok(output)) => build_web(&source, &output),
            (Err(error), _) | (_, Err(error)) => Err(error),
        },
        Some("release-manifest") => release::command(&args[1..]),
        _ => usage(),
    };
    if let Err(error) = result {
        eprintln!("another-dimension-tools: {error}");
        std::process::exit(1);
    }
}
