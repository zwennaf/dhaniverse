import fetch from 'node-fetch';
import AgentPkg from '@dfinity/agent';
const { HttpAgent } = AgentPkg;
import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';

const CANISTER_ID = '2v55c-vaaaa-aaaas-qbrpq-cai';

async function main() {
  // Use the public replica
  const agent = new HttpAgent({ fetch, host: 'https://ic0.app' });

  // Query the canister for the 'get_price_history' method and handle the agent's result object
  try {
    const res = await agent.query(
      Principal.fromText(CANISTER_ID),
      { methodName: 'get_price_history', arg: new Uint8Array() }
    );

    console.log('Agent query raw response keys:', Object.keys(res));

    if (res.status === 'rejected') {
      console.error('Query rejected:', res.reject_message || res.reject_code || res);
      return;
    }

    if (res.status === 'replied' && res.reply && res.reply.arg) {
      const candidBytes = new Uint8Array(res.reply.arg);
      const IDLType = IDL.Vec(IDL.Record({ timestamp: IDL.Nat64, prices: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Float64)) }));
      try {
        const decoded = IDL.decode(IDLType, candidBytes);
        console.log('Decoded via agent:');
        console.log(JSON.stringify(decoded, null, 2));
        return;
      } catch (e) {
        console.error('Candid decode failed:', e.message);
        console.log('Raw bytes hex:', Buffer.from(candidBytes).toString('hex'));
        return;
      }
    }

    console.error('Agent query returned no reply.arg and was not rejected; raw response:');
    console.error(JSON.stringify(res, null, 2));
    return;
  } catch (e) {
    console.error('Agent query failed:', e.message || e);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
