use crate::disk_image;
use crate::Failure;
use idevice::debug_proxy::DebugProxyClient;
use idevice::remote_pairing::{connect_tls_psk_tunnel_native, RemotePairingClient, RpPairingFile, RpPairingSocket};
use idevice::rsd::RsdHandshake;
use idevice::tcp::handle::AdapterHandle;
use idevice::{ReadWrite, RsdService};
use std::net::IpAddr;
use std::path::Path;
use std::time::Duration;
use tokio::net::TcpStream;
use tokio::time::timeout;

// LocalDevVPN routes this address back to the phone itself.
const PHONE: &str = "10.7.0.1";
const REMOTE_PAIRING_PORT: u16 = 49152;
const HOST_NAME: &str = "pkhemu";
const CONNECT_LIMIT: Duration = Duration::from_secs(10);
const PAIRING_LIMIT: Duration = Duration::from_secs(20);

pub struct Device {
    // The tunnel lasts as long as the pairing connection that opened it.
    _pairing: RemotePairingClient<RpPairingSocket<TcpStream>>,
    adapter: AdapterHandle,
    rsd_port: u16,
    rsd: RsdHandshake,
}

impl Device {
    pub async fn connect(pairing_file: &[u8]) -> Result<Device, Failure> {
        let mut pairing_file = RpPairingFile::from_bytes(pairing_file).map_err(|_| Failure::PairingRejected)?;
        let stream = connect(REMOTE_PAIRING_PORT).await?;
        let mut pairing = RemotePairingClient::new(RpPairingSocket::new(stream), HOST_NAME);
        // connect() would fall back to pairing again, which asks for a PIN on the phone.
        let verified = timeout(PAIRING_LIMIT, async {
            pairing.attempt_pair_verify().await?;
            pairing.validate_pairing(&mut pairing_file).await
        })
        .await;
        match verified {
            Ok(Ok(())) => {}
            Ok(Err(_)) => return Err(Failure::PairingRejected),
            Err(_) => return Err(Failure::Unreachable),
        }
        let port = pairing.create_tcp_listener().await.map_err(|_| Failure::Unreachable)?;
        let tunnel =
            timeout(PAIRING_LIMIT, connect_tls_psk_tunnel_native(connect(port).await?, pairing.encryption_key()))
                .await
                .map_err(|_| Failure::Unreachable)?
                .map_err(|_| Failure::PairingRejected)?;
        let info = tunnel.info.clone();
        let (host, phone) = match (info.client_address.parse::<IpAddr>(), info.server_address.parse::<IpAddr>()) {
            (Ok(host), Ok(phone)) => (host, phone),
            _ => return Err(Failure::Unreachable),
        };
        let mut adapter = idevice::tcp::adapter::Adapter::new(Box::new(tunnel.into_inner()), host, phone);
        adapter.set_mss((info.mtu as usize).saturating_sub(60));
        let mut adapter = adapter.to_async_handle();
        let rsd = handshake(&mut adapter, info.server_rsd_port).await?;
        Ok(Device { _pairing: pairing, adapter, rsd_port: info.server_rsd_port, rsd })
    }

    pub async fn mount_disk_image(&mut self, cache_dir: &Path) -> Result<(), Failure> {
        if !needs_disk_image(&self.rsd) {
            return Ok(());
        }
        disk_image::mount(&mut self.adapter, &mut self.rsd, cache_dir).await?;
        // debugserver ships on the disk image, so its service only shows up in a new list.
        self.rsd = handshake(&mut self.adapter, self.rsd_port).await?;
        if needs_disk_image(&self.rsd) {
            return Err(Failure::DiskImage("the disk image mounted, but debugserver isn't there".into()));
        }
        Ok(())
    }

    pub async fn debug_proxy(&mut self) -> Result<DebugProxyClient<Box<dyn ReadWrite>>, Failure> {
        DebugProxyClient::connect_rsd(&mut self.adapter, &mut self.rsd).await.map_err(|_| Failure::ConnectionLost)
    }
}

async fn connect(port: u16) -> Result<TcpStream, Failure> {
    match timeout(CONNECT_LIMIT, TcpStream::connect((PHONE, port))).await {
        Ok(Ok(stream)) => Ok(stream),
        _ => Err(Failure::Unreachable),
    }
}

async fn handshake(adapter: &mut AdapterHandle, port: u16) -> Result<RsdHandshake, Failure> {
    let stream = adapter.connect(port).await.map_err(|_| Failure::ConnectionLost)?;
    RsdHandshake::new(stream).await.map_err(|_| Failure::ConnectionLost)
}

fn needs_disk_image(rsd: &RsdHandshake) -> bool {
    !rsd.services.contains_key(&DebugProxyClient::<Box<dyn ReadWrite>>::rsd_service_name().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use idevice::rsd::RsdService as Service;
    use std::collections::HashMap;

    fn listing(services: &[&str]) -> RsdHandshake {
        let service = Service {
            entitlement: String::new(),
            port: 1,
            uses_remote_xpc: false,
            features: None,
            service_version: None,
        };
        RsdHandshake {
            services: services.iter().map(|name| (name.to_string(), service.clone())).collect(),
            protocol_version: 2,
            properties: HashMap::new(),
            uuid: String::new(),
        }
    }

    #[test]
    fn mounts_the_disk_image_when_debugserver_isnt_listed() {
        assert!(needs_disk_image(&listing(&["com.apple.mobile.mobile_image_mounter.shim.remote"])));
    }

    #[test]
    fn skips_the_disk_image_once_debugserver_is_listed() {
        assert!(!needs_disk_image(&listing(&["com.apple.internal.dt.remote.debugproxy"])));
    }
}
