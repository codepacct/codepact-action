use soroban_sdk::contracterror;

/// Every code is explicit, unique, and inside the 100-199 block reserved for
/// the token contract. The action must exit 0 on this directory even with
/// `strict: true`.
#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum TokenError {
    NotInitialized = 100,
    AlreadyInitialized = 101,
    InsufficientBalance = 102,
    InsufficientAllowance = 103,
    NegativeAmount = 104,
}
