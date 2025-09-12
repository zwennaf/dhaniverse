use crate::types::*;
use crate::storage;
use crate::error::CanisterError;
use ic_cdk::api::time;
use serde_json::json;
use std::collections::HashMap;

// Global counter for SSE event IDs (monotonically increasing)
static mut GLOBAL_EVENT_ID: u64 = 0;

fn next_event_id() -> u64 {
    unsafe {
        GLOBAL_EVENT_ID += 1;
        GLOBAL_EVENT_ID
    }
}

/// Create a new SSE room if it doesn't exist
pub fn create_room(room_id: &str) -> Result<(), CanisterError> {
    let now = time();
    
    // Check if room already exists
    if storage::get_sse_room(room_id).is_some() {
        return Ok(());
    }
    
    let room = SseRoom {
        room_id: room_id.to_string(),
        connections: Vec::new(),
        event_buffer: Vec::new(),
        max_buffer_size: SseConfig::default().max_buffer_size_per_room,
        created_at: now,
        last_activity: now,
    };
    
    storage::set_sse_room(room_id, room);
    Ok(())
}

/// Add a connection to a room
pub fn add_connection_to_room(
    room_id: &str, 
    connection_id: &str, 
    peer_id: &str,
    last_event_id: Option<u64>
) -> Result<(), CanisterError> {
    let now = time();
    
    // Create room if it doesn't exist
    create_room(room_id)?;
    
    // Create the connection
    let connection = SseConnection {
        connection_id: connection_id.to_string(),
        room_id: room_id.to_string(),
        peer_id: peer_id.to_string(),
        last_event_id,
        connected_at: now,
        last_activity: now,
    };
    
    // Store the connection
    storage::set_sse_connection(connection_id, connection);
    
    // Add connection to room
    let mut room = storage::get_sse_room(room_id)
        .ok_or(CanisterError::NotFound("Room not found".to_string()))?;
    
    // Check connection limits
    let config = SseConfig::default();
    if room.connections.len() >= config.max_connections_per_room {
        return Err(CanisterError::RateLimited("Too many connections in room".to_string()));
    }
    
    room.connections.push(connection_id.to_string());
    room.last_activity = now;
    storage::set_sse_room(room_id, room);
    
    Ok(())
}

/// Remove a connection from a room
pub fn remove_connection_from_room(connection_id: &str) -> Result<(), CanisterError> {
    // Get the connection to find the room
    let connection = storage::get_sse_connection(connection_id)
        .ok_or(CanisterError::NotFound("Connection not found".to_string()))?;
    
    let room_id = &connection.room_id;
    
    // Remove connection from room
    if let Some(mut room) = storage::get_sse_room(room_id) {
        room.connections.retain(|id| id != connection_id);
        room.last_activity = time();
        storage::set_sse_room(room_id, room);
    }
    
    // Remove the connection itself
    storage::remove_sse_connection(connection_id);
    
    Ok(())
}

/// Create and broadcast an SSE event to all connections in a room
pub fn broadcast_event(
    room_id: &str,
    event_type: SseEventType,
    data: serde_json::Value
) -> Result<Vec<String>, CanisterError> {
    let now = time();
    let event_id = next_event_id();
    
    // Create the event
    let event = SseEvent {
        id: event_id,
        event_type: format!("{:?}", event_type).to_lowercase().replace("_", "-"),
        data: data.to_string(),
        timestamp: now,
    };
    
    // Get the room
    let mut room = storage::get_sse_room(room_id)
        .ok_or(CanisterError::NotFound("Room not found".to_string()))?;
    
    // Add event to buffer
    room.event_buffer.push(event.clone());
    
    // Maintain buffer size limit
    if room.event_buffer.len() > room.max_buffer_size {
        room.event_buffer.remove(0);
    }
    
    room.last_activity = now;
    storage::set_sse_room(room_id, room.clone());
    
    // Return the list of connection IDs that should receive this event
    Ok(room.connections)
}

/// Get events for a connection since a specific event ID
pub fn get_events_since(
    room_id: &str,
    last_event_id: Option<u64>
) -> Result<Vec<SseEvent>, CanisterError> {
    let room = storage::get_sse_room(room_id)
        .ok_or(CanisterError::NotFound("Room not found".to_string()))?;
    
    let events = match last_event_id {
        Some(id) => {
            // Return events after the specified ID
            room.event_buffer
                .into_iter()
                .filter(|event| event.id > id)
                .collect()
        }
        None => {
            // Return all buffered events
            room.event_buffer
        }
    };
    
    Ok(events)
}

/// Format an SSE event for transmission
pub fn format_sse_event(event: &SseEvent) -> String {
    format!(
        "id: {}\nevent: {}\ndata: {}\n\n",
        event.id,
        event.event_type,
        event.data
    )
}

/// Create a peer-joined event
pub fn create_peer_joined_event(peer_id: &str, meta: HashMap<String, String>) -> serde_json::Value {
    json!({
        "peerId": peer_id,
        "meta": meta
    })
}

/// Create a peer-left event
pub fn create_peer_left_event(peer_id: &str) -> serde_json::Value {
    json!({
        "peerId": peer_id
    })
}

/// Create an offer event
pub fn create_offer_event(from: &str, to: &str, sdp: &str) -> serde_json::Value {
    json!({
        "from": from,
        "to": to,
        "sdp": sdp
    })
}

/// Create an answer event
pub fn create_answer_event(from: &str, to: &str, sdp: &str) -> serde_json::Value {
    json!({
        "from": from,
        "to": to,
        "sdp": sdp
    })
}

/// Create an ICE candidate event
pub fn create_ice_candidate_event(from: &str, to: &str, candidate: HashMap<String, String>) -> serde_json::Value {
    json!({
        "from": from,
        "to": to,
        "candidate": candidate
    })
}

/// Create a room state event
pub fn create_room_state_event(peers: Vec<String>, meta: HashMap<String, String>) -> serde_json::Value {
    json!({
        "peers": peers,
        "meta": meta
    })
}

/// Update connection activity timestamp
pub fn update_connection_activity(connection_id: &str) -> Result<(), CanisterError> {
    let mut connection = storage::get_sse_connection(connection_id)
        .ok_or(CanisterError::NotFound("Connection not found".to_string()))?;
    
    connection.last_activity = time();
    storage::set_sse_connection(connection_id, connection);
    
    Ok(())
}

/// Clean up expired connections and rooms
pub fn cleanup_expired_connections() -> usize {
    let now = time();
    let config = SseConfig::default();
    let mut cleaned_up = 0;
    
    // Get all connections and check for expiry
    let connection_ids = storage::get_all_sse_connection_ids();
    
    for connection_id in connection_ids {
        if let Some(connection) = storage::get_sse_connection(&connection_id) {
            if now.saturating_sub(connection.last_activity) > config.connection_timeout_ms * 1_000_000 {
                // Connection has expired
                let _ = remove_connection_from_room(&connection_id);
                cleaned_up += 1;
            }
        }
    }
    
    // Clean up empty rooms and old events
    let room_ids = storage::get_all_sse_room_ids();
    
    for room_id in room_ids {
        if let Some(mut room) = storage::get_sse_room(&room_id) {
            // Remove old events
            let old_event_count = room.event_buffer.len();
            room.event_buffer.retain(|event| {
                now.saturating_sub(event.timestamp) <= config.max_event_age_ms * 1_000_000
            });
            
            // If room is empty and old, remove it
            if room.connections.is_empty() && 
               now.saturating_sub(room.last_activity) > config.connection_timeout_ms * 1_000_000 {
                storage::remove_sse_room(&room_id);
            } else {
                // Update room if events were cleaned
                if room.event_buffer.len() != old_event_count {
                    storage::set_sse_room(&room_id, room);
                }
            }
        }
    }
    
    cleaned_up
}

/// Get room statistics
pub fn get_room_stats(room_id: &str) -> Result<(usize, usize), CanisterError> {
    let room = storage::get_sse_room(room_id)
        .ok_or(CanisterError::NotFound("Room not found".to_string()))?;
    
    Ok((room.connections.len(), room.event_buffer.len()))
}

/// Get global SSE statistics
pub fn get_global_stats() -> (usize, usize, usize) {
    let room_count = storage::get_all_sse_room_ids().len();
    let connection_count = storage::get_all_sse_connection_ids().len();
    let total_events: usize = storage::get_all_sse_room_ids()
        .iter()
        .filter_map(|room_id| storage::get_sse_room(room_id))
        .map(|room| room.event_buffer.len())
        .sum();
    
    (room_count, connection_count, total_events)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    #[test]
    fn test_format_sse_event() {
        let event = SseEvent {
            id: 123,
            event_type: "peer-joined".to_string(),
            data: r#"{"peerId":"test-peer","meta":{}}"#.to_string(),
            timestamp: 1234567890,
        };
        
        let formatted = format_sse_event(&event);
        let expected = "id: 123\nevent: peer-joined\ndata: {\"peerId\":\"test-peer\",\"meta\":{}}\n\n";
        
        assert_eq!(formatted, expected);
    }

    #[test]
    fn test_create_peer_joined_event() {
        let mut meta = HashMap::new();
        meta.insert("username".to_string(), "alice".to_string());
        
        let event_data = create_peer_joined_event("peer-123", meta);
        
        assert_eq!(event_data["peerId"], "peer-123");
        assert_eq!(event_data["meta"]["username"], "alice");
    }

    #[test]
    fn test_create_peer_left_event() {
        let event_data = create_peer_left_event("peer-123");
        
        assert_eq!(event_data["peerId"], "peer-123");
    }

    #[test]
    fn test_create_offer_event() {
        let event_data = create_offer_event("peer-1", "peer-2", "sdp-content");
        
        assert_eq!(event_data["from"], "peer-1");
        assert_eq!(event_data["to"], "peer-2");
        assert_eq!(event_data["sdp"], "sdp-content");
    }

    #[test]
    fn test_create_answer_event() {
        let event_data = create_answer_event("peer-2", "peer-1", "sdp-answer");
        
        assert_eq!(event_data["from"], "peer-2");
        assert_eq!(event_data["to"], "peer-1");
        assert_eq!(event_data["sdp"], "sdp-answer");
    }

    #[test]
    fn test_create_ice_candidate_event() {
        let mut candidate = HashMap::new();
        candidate.insert("candidate".to_string(), "ice-candidate-string".to_string());
        candidate.insert("sdpMid".to_string(), "0".to_string());
        
        let event_data = create_ice_candidate_event("peer-1", "peer-2", candidate.clone());
        
        assert_eq!(event_data["from"], "peer-1");
        assert_eq!(event_data["to"], "peer-2");
        assert_eq!(event_data["candidate"]["candidate"], "ice-candidate-string");
        assert_eq!(event_data["candidate"]["sdpMid"], "0");
    }

    #[test]
    fn test_create_room_state_event() {
        let peers = vec!["peer-1".to_string(), "peer-2".to_string()];
        let mut meta = HashMap::new();
        meta.insert("totalPeers".to_string(), "2".to_string());
        
        let event_data = create_room_state_event(peers, meta);
        
        assert_eq!(event_data["peers"].as_array().unwrap().len(), 2);
        assert_eq!(event_data["peers"][0], "peer-1");
        assert_eq!(event_data["peers"][1], "peer-2");
        assert_eq!(event_data["meta"]["totalPeers"], "2");
    }

    #[test]
    fn test_sse_config_default() {
        let config = SseConfig::default();
        
        assert_eq!(config.max_connections_per_room, 100);
        assert_eq!(config.max_buffer_size_per_room, 1000);
        assert_eq!(config.connection_timeout_ms, 5 * 60 * 1000);
        assert_eq!(config.max_event_age_ms, 10 * 60 * 1000);
        assert_eq!(config.cleanup_interval_ms, 60 * 1000);
    }

    #[test]
    fn test_next_event_id_increments() {
        let id1 = next_event_id();
        let id2 = next_event_id();
        
        assert!(id2 > id1);
        assert_eq!(id2, id1 + 1);
    }

    // Note: Integration tests that require storage would need to be moved to a separate test file
    // since they would require proper canister initialization
}