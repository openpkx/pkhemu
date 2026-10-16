use super::signature::missing_memory;
use super::Entitlement;
use std::io::Cursor;

const EVA: &str = "com.apple.developer.kernel.extended-virtual-addressing";
const IML: &str = "com.apple.developer.kernel.increased-memory-limit";

fn plist(entries: &[(&str, &str)]) -> Vec<u8> {
    let body: String = entries.iter().map(|(key, value)| format!("<key>{key}</key>{value}")).collect();
    format!(
        r#"<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd"><plist version="1.0"><dict>{body}</dict></plist>"#
    )
    .into_bytes()
}

fn blob(magic: u32, payload: &[u8]) -> Vec<u8> {
    let mut blob = magic.to_be_bytes().to_vec();
    blob.extend((8 + payload.len() as u32).to_be_bytes());
    blob.extend(payload);
    blob
}

fn signature(entitlements: Option<&[u8]>) -> Vec<u8> {
    let mut blobs = vec![(0u32, blob(0xfade0c02, &[0; 8]))];
    if let Some(xml) = entitlements {
        blobs.push((5, blob(0xfade7171, xml)));
    }
    let header = 12 + 8 * blobs.len();
    let mut index = Vec::new();
    let mut data: Vec<u8> = Vec::new();
    for (kind, blob) in &blobs {
        index.extend(kind.to_be_bytes());
        index.extend(((header + data.len()) as u32).to_be_bytes());
        data.extend(blob);
    }
    let mut superblob = 0xfade0cc0u32.to_be_bytes().to_vec();
    superblob.extend(((header + data.len()) as u32).to_be_bytes());
    superblob.extend((blobs.len() as u32).to_be_bytes());
    superblob.extend(index);
    superblob.extend(data);
    superblob
}

fn executable(signature: Option<Vec<u8>>) -> Cursor<Vec<u8>> {
    let mut commands = Vec::new();
    for word in [0x1b_u32, 24, 0, 0, 0, 0] {
        commands.extend(word.to_le_bytes());
    }
    let code_start = 32 + commands.len() + if signature.is_some() { 16 } else { 0 };
    let code = vec![0xcc; 64];
    if let Some(signature) = &signature {
        let offset = (code_start + code.len()) as u32;
        for word in [0x1d_u32, 16, offset, signature.len() as u32] {
            commands.extend(word.to_le_bytes());
        }
    }
    let ncmds = if signature.is_some() { 2u32 } else { 1 };
    let mut file = Vec::new();
    for word in [0xfeedfacf_u32, 0x0100000c, 0, 2, ncmds, commands.len() as u32, 0, 0] {
        file.extend(word.to_le_bytes());
    }
    file.extend(commands);
    file.extend(code);
    file.extend(signature.unwrap_or_default());
    Cursor::new(file)
}

#[test]
fn finds_nothing_missing_when_both_memory_entitlements_are_signed_in() {
    let xml = plist(&[(EVA, "<true/>"), (IML, "<true/>"), ("get-task-allow", "<true/>")]);
    assert_eq!(missing_memory(&mut executable(Some(signature(Some(&xml))))), Some(vec![]));
}

#[test]
fn names_each_memory_entitlement_the_signature_lacks() {
    let xml = plist(&[("get-task-allow", "<true/>")]);
    assert_eq!(
        missing_memory(&mut executable(Some(signature(Some(&xml))))),
        Some(vec![Entitlement::ExtendedVirtualAddressing, Entitlement::IncreasedMemoryLimit])
    );
}

#[test]
fn counts_an_entitlement_set_to_false_as_missing() {
    let xml = plist(&[(EVA, "<false/>"), (IML, "<true/>")]);
    assert_eq!(
        missing_memory(&mut executable(Some(signature(Some(&xml))))),
        Some(vec![Entitlement::ExtendedVirtualAddressing])
    );
}

#[test]
fn finds_both_missing_from_a_signature_without_entitlements() {
    assert_eq!(
        missing_memory(&mut executable(Some(signature(None)))),
        Some(vec![Entitlement::ExtendedVirtualAddressing, Entitlement::IncreasedMemoryLimit])
    );
}

#[test]
fn cannot_tell_for_an_unsigned_executable() {
    assert_eq!(missing_memory(&mut executable(None)), None);
}

#[test]
fn cannot_tell_for_a_file_that_isnt_an_executable() {
    assert_eq!(missing_memory(&mut Cursor::new(b"not a Mach-O file at all, just text".to_vec())), None);
}
