use soroban_sdk::contracterror;

/// Deliberately broken. `PairNotFound` and `IdenticalAddresses` share code 300,
/// 300 also belongs to `FactoryError` next door, and `Unauthorized` has no
/// explicit discriminant.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum RouterError {
    NotInitialized = 200,
    DeadlineExpired = 201,
    InvalidPath = 202,
    PairNotFound = 300,
    IdenticalAddresses = 300,
    Unauthorized,
}
