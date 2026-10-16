use super::Entitlement;
use std::io::{Read, Seek, SeekFrom};

const MH_MAGIC_64: u32 = 0xfeedfacf;
const LC_CODE_SIGNATURE: u32 = 0x1d;
const EMBEDDED_SIGNATURE: u32 = 0xfade0cc0;
const ENTITLEMENTS_SLOT: u32 = 5;
const ENTITLEMENTS_BLOB: u32 = 0xfade7171;

impl Entitlement {
    const MEMORY: [Entitlement; 2] = [Entitlement::ExtendedVirtualAddressing, Entitlement::IncreasedMemoryLimit];

    fn key(self) -> &'static str {
        match self {
            Entitlement::ExtendedVirtualAddressing => "com.apple.developer.kernel.extended-virtual-addressing",
            Entitlement::IncreasedMemoryLimit => "com.apple.developer.kernel.increased-memory-limit",
        }
    }
}

/// The memory entitlements an executable's code signature lacks, or None when it has no signature to read. The kernel
/// grants what the signature holds, not what the provisioning profile allows.
pub fn missing_memory(executable: &mut (impl Read + Seek)) -> Option<Vec<Entitlement>> {
    let entitlements = entitlements(&code_signature(executable)?)?;
    let granted =
        |entitlement: Entitlement| entitlements.get(entitlement.key()).and_then(plist::Value::as_boolean) == Some(true);
    Some(Entitlement::MEMORY.into_iter().filter(|&entitlement| !granted(entitlement)).collect())
}

fn code_signature(file: &mut (impl Read + Seek)) -> Option<Vec<u8>> {
    let mut header = [0; 32];
    file.read_exact(&mut header).ok()?;
    if le(&header, 0)? != MH_MAGIC_64 {
        return None;
    }
    let mut commands = Vec::new();
    file.take(le(&header, 20)?.into()).read_to_end(&mut commands).ok()?;
    let mut at = 0;
    for _ in 0..le(&header, 16)? {
        if le(&commands, at)? == LC_CODE_SIGNATURE {
            file.seek(SeekFrom::Start(le(&commands, at + 8)?.into())).ok()?;
            let mut signature = Vec::new();
            file.take(le(&commands, at + 12)?.into()).read_to_end(&mut signature).ok()?;
            return Some(signature);
        }
        at += le(&commands, at + 4)? as usize;
    }
    None
}

/// An empty dictionary for a signature without entitlements, and None for one that can't be read.
fn entitlements(signature: &[u8]) -> Option<plist::Dictionary> {
    if be(signature, 0)? != EMBEDDED_SIGNATURE {
        return None;
    }
    for slot in 0..be(signature, 8)? as usize {
        let index = 12 + 8 * slot;
        if be(signature, index)? != ENTITLEMENTS_SLOT {
            continue;
        }
        let blob = be(signature, index + 4)? as usize;
        if be(signature, blob)? != ENTITLEMENTS_BLOB {
            return None;
        }
        let xml = signature.get(blob + 8..blob + be(signature, blob + 4)? as usize)?;
        return plist::from_bytes(xml).ok();
    }
    Some(plist::Dictionary::new())
}

fn le(bytes: &[u8], at: usize) -> Option<u32> {
    Some(u32::from_le_bytes(bytes.get(at..at + 4)?.try_into().ok()?))
}

fn be(bytes: &[u8], at: usize) -> Option<u32> {
    Some(u32::from_be_bytes(bytes.get(at..at + 4)?.try_into().ok()?))
}
