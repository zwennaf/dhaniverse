import cbor from 'cbor';
import fetch from 'node-fetch';
import fs from 'fs';
import { IDL } from '@dfinity/candid';

// Build CBOR request variants to try different envelope shapes the gateway may expect.
const METHOD = 'get_price_history';

function buildCborQueryVariant(variant) {
  // Common content map
  const content = new Map();
  content.set('method_name', METHOD);
  content.set('arg', Buffer.from([]));

  // Top-level map
  const top = new Map();

  // Some gateways accept a 'content' map, others expect 'content' as raw CBOR bytes.
  if (variant === 'content_map' || variant === 'sender_empty' || variant === 'sender_bytes0') {
    top.set('content', content);
  } else if (variant === 'content_bytes') {
    // encode the content map as CBOR bytes and place under 'content'
    top.set('content', cbor.encode(content));
  }

  // Try different sender encodings per variant
  if (variant === 'sender_empty') {
    top.set('sender', Buffer.from([])); // empty bytes
  } else if (variant === 'sender_bytes0') {
    top.set('sender', Buffer.from([0])); // single zero byte
  } else if (variant === 'sender_principal_text') {
    // principal text (as utf8 bytes), e.g. '2v55c-vaaaa-aaaas-qbrpq-cai' - not typical but try
    top.set('sender', Buffer.from('2v55c-vaaaa-aaaas-qbrpq-cai', 'utf8'));
  } else if (variant === 'sender_principal_der') {
    // DER-like: not truly a principal, try an array of bytes with length prefix
    top.set('sender', Buffer.from([0, 1, 2, 3]));
  } else if (variant === 'no_sender') {
    // omit sender entirely
  }

  // ingress_expiry: set to now + 60s (in nanoseconds)
  const nowNs = BigInt(Date.now()) * 1000000n;
  const expiry = nowNs + 60n * 1000000000n;
  top.set('ingress_expiry', expiry);

  return cbor.encode(top);
}

async function main() {
  const url = 'https://ic0.app/api/v2/canister/2v55c-vaaaa-aaaas-qbrpq-cai/query';
  const variants = [
    'content_map',
    'content_bytes',
    'sender_empty',
    'sender_bytes0',
    'sender_principal_text',
    'sender_principal_der',
    'no_sender'
  ];

  for (const v of variants) {
    console.log('\n--- Trying variant:', v, '---');
    const body = buildCborQueryVariant(v);
    console.log('POST', url);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/cbor' },
      body,
    });

    const buf = Buffer.from(await res.arrayBuffer());
    console.log('HTTP', res.status, res.statusText);

    // If not ok, print utf8 body (gateway often returns CBOR error as utf8 text)
    if (!res.ok) {
      try {
        console.error(buf.toString('utf8'));
      } catch (e) {
        console.error('HTTP error and unable to decode body');
      }
      continue;
    }

    let parsed;
    try {
      parsed = cbor.decodeFirstSync(buf);
      console.log('Parsed CBOR response:');
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.error('Failed to parse CBOR response:', e.message);
      console.error('Raw (utf8):', buf.toString('utf8'));
      continue;
    }

    if (parsed && parsed.reply && parsed.reply.arg) {
      const candidBytes = Buffer.from(parsed.reply.arg);
      try {
        const IDLType = IDL.Vec(IDL.Record({
          timestamp: IDL.Nat64,
          prices: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Float64))
        }));
        const decoded = IDL.decode(IDLType, candidBytes);
        console.log('Decoded reply (variant ' + v + '):');
        console.log(JSON.stringify(decoded, null, 2));
        return;
      } catch (e) {
        console.log('Failed candid decode with fallback type:', e.message);
      }

      // Fallback: try interpreting bytes as UTF-8 JSON
      try {
        const s = candidBytes.toString('utf8');
        console.log('Candid bytes as UTF-8:', s);
      } catch (e) {
        console.error('Unable to decode candid bytes as utf8');
      }
      console.log('Raw reply arg (hex):', candidBytes.toString('hex'));
      return;
    }

    console.log('No reply.arg in parsed response for variant', v);
  }
  console.error('All variants tried, none returned a successful reply.arg');
}

main().catch(e => { console.error(e); process.exit(2); });
