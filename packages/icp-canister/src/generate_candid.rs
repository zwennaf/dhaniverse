use std::env;
use std::io::Write;

fn main() {
    let dir = env::current_dir().unwrap();
    
    match candid::export_service!() {
        Ok(service) => {
            let mut file = std::fs::File::create(dir.join("rust_icp_canister.did")).unwrap();
            write!(file, "{}", service).unwrap();
        }
        Err(err) => {
            eprintln!("Error generating candid: {}", err);
            std::process::exit(1);
        }
    }
}