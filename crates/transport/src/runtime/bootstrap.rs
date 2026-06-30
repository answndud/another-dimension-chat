use crate::{
    RedactedTransportRuntimeEvent, TransportRuntimeError, TransportRuntimeEventSink,
    TransportRuntimeReady,
};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TransportBootstrapPolicyError {
    ZeroTimeout,
    TimeoutTooLong,
    ZeroRetryAttempts,
    TooManyRetryAttempts,
    ZeroBackoff,
    BackoffExceedsMaximum,
    SilentRetryForbidden,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TransportBootstrapTimeoutPolicy {
    seconds: u16,
}

impl TransportBootstrapTimeoutPolicy {
    pub const MAX_TIMEOUT_SECONDS: u16 = 120;

    pub fn new(seconds: u16) -> Result<Self, TransportBootstrapPolicyError> {
        if seconds == 0 {
            return Err(TransportBootstrapPolicyError::ZeroTimeout);
        }
        if seconds > Self::MAX_TIMEOUT_SECONDS {
            return Err(TransportBootstrapPolicyError::TimeoutTooLong);
        }
        Ok(Self { seconds })
    }

    pub fn high_risk_default() -> Self {
        Self { seconds: 45 }
    }

    pub fn seconds(self) -> u16 {
        self.seconds
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TransportBootstrapRetryPolicy {
    max_attempts: u8,
    initial_backoff_ms: u32,
    max_backoff_ms: u32,
}

impl TransportBootstrapRetryPolicy {
    pub const MAX_ATTEMPTS: u8 = 3;

    pub fn new(
        max_attempts: u8,
        initial_backoff_ms: u32,
        max_backoff_ms: u32,
    ) -> Result<Self, TransportBootstrapPolicyError> {
        if max_attempts == 0 {
            return Err(TransportBootstrapPolicyError::ZeroRetryAttempts);
        }
        if max_attempts > Self::MAX_ATTEMPTS {
            return Err(TransportBootstrapPolicyError::TooManyRetryAttempts);
        }
        if initial_backoff_ms == 0 || max_backoff_ms == 0 {
            return Err(TransportBootstrapPolicyError::ZeroBackoff);
        }
        if initial_backoff_ms > max_backoff_ms {
            return Err(TransportBootstrapPolicyError::BackoffExceedsMaximum);
        }
        Ok(Self {
            max_attempts,
            initial_backoff_ms,
            max_backoff_ms,
        })
    }

    pub fn high_risk_default() -> Self {
        Self {
            max_attempts: 2,
            initial_backoff_ms: 500,
            max_backoff_ms: 2_000,
        }
    }

    pub fn max_attempts(self) -> u8 {
        self.max_attempts
    }

    pub fn initial_backoff_ms(self) -> u32 {
        self.initial_backoff_ms
    }

    pub fn max_backoff_ms(self) -> u32 {
        self.max_backoff_ms
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TransportBootstrapPolicy {
    timeout: TransportBootstrapTimeoutPolicy,
    retry: TransportBootstrapRetryPolicy,
    allow_silent_retry: bool,
    classify_censorship_separately: bool,
}

impl TransportBootstrapPolicy {
    pub fn new(
        timeout: TransportBootstrapTimeoutPolicy,
        retry: TransportBootstrapRetryPolicy,
        allow_silent_retry: bool,
        classify_censorship_separately: bool,
    ) -> Result<Self, TransportBootstrapPolicyError> {
        if allow_silent_retry {
            return Err(TransportBootstrapPolicyError::SilentRetryForbidden);
        }
        Ok(Self {
            timeout,
            retry,
            allow_silent_retry,
            classify_censorship_separately,
        })
    }

    pub fn high_risk_default() -> Self {
        Self {
            timeout: TransportBootstrapTimeoutPolicy::high_risk_default(),
            retry: TransportBootstrapRetryPolicy::high_risk_default(),
            allow_silent_retry: false,
            classify_censorship_separately: true,
        }
    }

    pub fn timeout(self) -> TransportBootstrapTimeoutPolicy {
        self.timeout
    }

    pub fn retry(self) -> TransportBootstrapRetryPolicy {
        self.retry
    }

    pub fn allow_silent_retry(self) -> bool {
        self.allow_silent_retry
    }

    pub fn classify_censorship_separately(self) -> bool {
        self.classify_censorship_separately
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum TransportBootstrapOutcome {
    Cancelled,
    TimedOut,
    CensorshipOrBridgeRequired,
    TransientNetworkFailure,
}

impl TransportBootstrapOutcome {
    pub fn runtime_error(self, policy: TransportBootstrapPolicy) -> TransportRuntimeError {
        match self {
            Self::Cancelled => TransportRuntimeError::BootstrapCancelled,
            Self::TimedOut => TransportRuntimeError::BootstrapTimeout,
            Self::TransientNetworkFailure => TransportRuntimeError::BootstrapTransientFailure,
            Self::CensorshipOrBridgeRequired if policy.classify_censorship_separately() => {
                TransportRuntimeError::CensorshipOrBridgeRequired
            }
            Self::CensorshipOrBridgeRequired => TransportRuntimeError::BootstrapTimeout,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct TransportBootstrapExecutionSkeleton {
    runtime_ready: TransportRuntimeReady,
    policy: TransportBootstrapPolicy,
}

impl TransportBootstrapExecutionSkeleton {
    pub fn new(runtime_ready: TransportRuntimeReady, policy: TransportBootstrapPolicy) -> Self {
        Self {
            runtime_ready,
            policy,
        }
    }

    pub fn policy(self) -> TransportBootstrapPolicy {
        self.policy
    }

    pub fn runtime_ready(self) -> TransportRuntimeReady {
        self.runtime_ready
    }

    pub fn execute_fail_closed<S: TransportRuntimeEventSink>(
        self,
        outcome: TransportBootstrapOutcome,
        sink: &mut S,
    ) -> Result<(), TransportRuntimeError> {
        let _ = self.runtime_ready;
        let error = outcome.runtime_error(self.policy);
        sink.record(RedactedTransportRuntimeEvent::bootstrap_failed(error));
        Err(error)
    }
}
