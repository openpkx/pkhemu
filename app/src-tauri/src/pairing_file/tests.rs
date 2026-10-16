use super::{import, is_set, path, remove};
use plist::{Dictionary, Value};
use std::path::PathBuf;

fn data_dir(name: &str) -> PathBuf {
    let dir = std::env::temp_dir().join(format!("pkh-emu-pairing-{name}-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    dir
}

fn pairing(without: &[&str]) -> Dictionary {
    let pem = |label: &str| Value::Data(format!("-----BEGIN {label}-----\nAAAA\n-----END {label}-----\n").into_bytes());
    let mut keys = Dictionary::new();
    keys.insert("DeviceCertificate".into(), pem("CERTIFICATE"));
    keys.insert("HostPrivateKey".into(), pem("PRIVATE KEY"));
    keys.insert("HostCertificate".into(), pem("CERTIFICATE"));
    keys.insert("RootPrivateKey".into(), pem("PRIVATE KEY"));
    keys.insert("RootCertificate".into(), pem("CERTIFICATE"));
    keys.insert("SystemBUID".into(), Value::String("30BA1C8E-0000-0000-0000-000000000000".into()));
    keys.insert("HostID".into(), Value::String("5A1D3B2C-0000-0000-0000-000000000000".into()));
    keys.insert("EscrowBag".into(), Value::Data(vec![1, 2, 3]));
    keys.insert("WiFiMACAddress".into(), Value::String("aa:bb:cc:dd:ee:ff".into()));
    keys.insert("UDID".into(), Value::String("00008140-0000000000000000".into()));
    keys.insert("public_key".into(), Value::Data(vec![7; 32]));
    keys.insert("private_key".into(), Value::Data(vec![9; 32]));
    keys.insert("identifier".into(), Value::String("6F1C2D3E-0000-0000-0000-000000000000".into()));
    for key in without {
        keys.remove(key);
    }
    keys
}

fn xml(keys: Dictionary) -> Vec<u8> {
    let mut bytes = Vec::new();
    Value::Dictionary(keys).to_writer_xml(&mut bytes).unwrap();
    bytes
}

fn binary(keys: Dictionary) -> Vec<u8> {
    let mut bytes = Vec::new();
    Value::Dictionary(keys).to_writer_binary(&mut bytes).unwrap();
    bytes
}

fn xml_array() -> Vec<u8> {
    let mut bytes = Vec::new();
    Value::Array(vec![]).to_writer_xml(&mut bytes).unwrap();
    bytes
}

#[test]
fn keeps_a_pairing_file_in_the_app_data() {
    let dir = data_dir("keeps");
    let bytes = xml(pairing(&[]));

    import(&dir, "iPhone.mobiledevicepairing", &bytes).unwrap();

    assert!(is_set(&dir));
    assert_eq!(std::fs::read(path(&dir)).unwrap(), bytes);
}

#[test]
fn takes_a_binary_plist() {
    let dir = data_dir("binary");

    import(&dir, "iPhone.plist", &binary(pairing(&[]))).unwrap();

    assert!(is_set(&dir));
}

#[test]
fn doesnt_need_the_escrow_bag_or_udid() {
    let dir = data_dir("optional");

    import(&dir, "Watch.plist", &xml(pairing(&["EscrowBag", "UDID"]))).unwrap();
}

#[test]
fn names_the_keys_a_pairing_file_is_missing() {
    let dir = data_dir("missing");

    let error = import(&dir, "iPhone.plist", &xml(pairing(&["HostID", "RootCertificate"]))).unwrap_err();

    assert!(error.contains("HostID") && error.contains("RootCertificate"), "{error}");
    assert!(!error.contains("SystemBUID"), "{error}");
    assert!(!is_set(&dir));
}

#[test]
fn asks_for_a_new_file_when_the_remote_pairing_keys_are_missing() {
    let dir = data_dir("lockdown-only");

    let error = import(&dir, "iPhone.plist", &xml(pairing(&["public_key", "private_key", "identifier"]))).unwrap_err();

    assert!(error.contains("iloader"), "{error}");
    assert!(!is_set(&dir));
}

#[test]
fn counts_a_key_of_the_wrong_type_as_missing() {
    let dir = data_dir("wrong-type");
    let mut keys = pairing(&[]);
    keys.insert("HostID".into(), Value::Integer(5.into()));
    keys.insert("DeviceCertificate".into(), Value::String("not data".into()));

    let error = import(&dir, "iPhone.plist", &xml(keys)).unwrap_err();

    assert!(error.contains("HostID") && error.contains("DeviceCertificate"), "{error}");
}

#[test]
fn rejects_a_file_that_isnt_a_plist() {
    let dir = data_dir("not-plist");

    assert!(import(&dir, "iPhone.plist", b"not a plist").is_err());
    assert!(import(&dir, "iPhone.plist", &xml_array()).is_err());
    assert!(!is_set(&dir));
}

#[test]
fn takes_only_mobiledevicepairing_and_plist_files() {
    let dir = data_dir("extension");
    let bytes = xml(pairing(&[]));

    assert!(import(&dir, "iPhone.txt", &bytes).is_err());
    assert!(import(&dir, "iPhone", &bytes).is_err());
    import(&dir, "iPhone.MobileDevicePairing", &bytes).unwrap();
}

#[test]
fn replaces_an_earlier_pairing_file() {
    let dir = data_dir("replaces");
    import(&dir, "old.plist", &xml(pairing(&[]))).unwrap();
    let mut keys = pairing(&[]);
    keys.insert("HostID".into(), Value::String("NEW".into()));
    let newer = xml(keys);

    import(&dir, "new.plist", &newer).unwrap();

    assert_eq!(std::fs::read(path(&dir)).unwrap(), newer);
}

#[test]
fn keeps_the_earlier_pairing_file_when_the_new_one_is_rejected() {
    let dir = data_dir("keeps-earlier");
    let earlier = xml(pairing(&[]));
    import(&dir, "old.plist", &earlier).unwrap();

    assert!(import(&dir, "new.plist", &xml(pairing(&["HostID"]))).is_err());

    assert_eq!(std::fs::read(path(&dir)).unwrap(), earlier);
}

#[test]
fn removes_the_pairing_file() {
    let dir = data_dir("removes");
    import(&dir, "iPhone.plist", &xml(pairing(&[]))).unwrap();

    remove(&dir).unwrap();

    assert!(!is_set(&dir));
    remove(&dir).unwrap();
}
