#![forbid(unsafe_code)]

use another_dimension_daemon::{cli, Command, IMPLEMENTATION_STATUS, PRODUCT_ROLE};
use std::io::{self, Read};

fn print_help() {
    println!("Another Dimension local security daemon");
    println!("role: {PRODUCT_ROLE}");
    println!("status: {IMPLEMENTATION_STATUS}");
    for command in Command::ALL {
        println!("  {}", command.as_str());
    }
    println!("Use --help for the local workflow. High-risk release remains disabled.");
}

fn main() {
    let args: Vec<String> = std::env::args().skip(1).collect();
    if args.is_empty()
        || args.first().map(String::as_str) == Some("--help")
        || args.first().map(String::as_str) == Some("-h")
    {
        print_help();
        return;
    }
    let passphrase = if cli::needs_passphrase(&args) {
        let mut input = String::new();
        if io::stdin().read_to_string(&mut input).is_err() {
            eprintln!("could not read passphrase from stdin");
            std::process::exit(2);
        }
        Some(input.trim_end_matches(['\r', '\n']).to_owned())
    } else {
        None
    };
    match cli::run(&args, passphrase.as_deref()) {
        Ok(output) => println!("{output}"),
        Err(error) => {
            eprintln!("{error}");
            std::process::exit(2);
        }
    }
}
