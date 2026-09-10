import {
  AmrAgentNode,
  P2PMessage,
  P2PMessageType,
  EspNowPacketMetadata,
  VirtualEsp32Device,
  VirtualEsp32PeerEntry,
} from '../../types/p2p';

/**
 * Generates a deterministic virtual ESP32 MAC address based on robot/system ID.
 * Example:
 *  - "AMR-01" -> "30:AE:A4:01:00:01"
 *  - "AMR-02" -> "30:AE:A4:01:00:02"
 *  - "TASK_DISPATCH" / "SYSTEM" -> "30:AE:A4:00:00:00"
 *  - "ALL" -> "FF:FF:FF:FF:FF:FF"
 */
export function getVirtualMacAddress(robotId: string): string {
  if (robotId === 'TASK_DISPATCH' || robotId === 'SYSTEM') {
    return '30:AE:A4:00:00:00';
  }
  if (robotId === 'ALL') {
    return 'FF:FF:FF:FF:FF:FF';
  }
  const match = robotId.match(/\d+/);
  const num = match ? parseInt(match[0], 10) : 1;
  const hexNum = num.toString(16).padStart(2, '0').toUpperCase();
  return `30:AE:A4:01:00:${hexNum}`;
}

/**
 * Initializes a Virtual ESP32 device for an AMR.
 */
export function createVirtualEsp32Device(robotId: string): VirtualEsp32Device {
  return {
    macAddress: getVirtualMacAddress(robotId),
    channel: 1, // Standard 2.4GHz Wi-Fi / ESP-NOW channel
    boardType: 'ESP32-WROOM-32 (SIMULATED)',
    txPowerDbm: 20,
    localPeerTable: {},
  };
}

/**
 * Wraps a P2PMessage into a simulated ESP-NOW packet frame.
 */
export function wrapEspNowPacket(message: P2PMessage): EspNowPacketMetadata {
  const srcMac = getVirtualMacAddress(message.senderId);
  const dstMac = getVirtualMacAddress(message.receiverId);
  const isBroadcast = message.receiverId === 'ALL';

  // Calculate approximate simulated payload size (ESP-NOW payload max ~250 bytes)
  const payloadStr = typeof message.payload === 'string' ? message.payload : JSON.stringify(message.payload || {});
  let payloadBytes = 0;
  try {
    payloadBytes = Math.min(250, new TextEncoder().encode(payloadStr).length);
  } catch {
    payloadBytes = Math.min(250, payloadStr.length);
  }

  // Determine delivery mode based on message type and receiver
  let deliveryMode: EspNowPacketMetadata['deliveryMode'] = 'UNICAST';
  if (isBroadcast) {
    if (message.type === 'TASK_ANNOUNCEMENT' || message.type === 'EMERGENCY' || message.type === 'HELLO') {
      deliveryMode = 'BROADCAST';
    } else {
      deliveryMode = 'SELECTIVE';
    }
  }

  return {
    protocol: 'SIMULATED_ESP_NOW',
    packetId: `ESP-PKT-${message.id}`,
    srcMac,
    dstMac,
    channel: 1,
    rssi: isBroadcast ? -65 : -55,
    deliveryStatus: 'DELIVERED',
    deliveryMode,
    payloadBytes,
  };
}

/**
 * Simulated ESP-NOW Transport Layer for Decentralized AMR Communication.
 * Implements virtual ESP32 peer-to-peer frame encapsulation, local peer tables,
 * and selective decentralized routing.
 */
export class SimulatedEspNowTransport {
  private virtualDevices: Map<string, VirtualEsp32Device> = new Map();

  /**
   * Registers a virtual ESP32 device for an AMR node.
   */
  registerDevice(robotId: string): VirtualEsp32Device {
    if (this.virtualDevices.has(robotId)) {
      return this.virtualDevices.get(robotId)!;
    }
    const dev = createVirtualEsp32Device(robotId);
    this.virtualDevices.set(robotId, dev);
    return dev;
  }

  /**
   * Unregisters a virtual ESP32 device.
   */
  unregisterDevice(robotId: string): void {
    this.virtualDevices.delete(robotId);
    this.virtualDevices.forEach((dev) => {
      delete dev.localPeerTable[robotId];
    });
  }

  /**
   * Pairs two virtual ESP32 nodes into their local ESP-NOW peer tables.
   */
  pairPeers(robotIdA: string, robotIdB: string, channel: number = 1): void {
    const devA = this.virtualDevices.get(robotIdA);
    const devB = this.virtualDevices.get(robotIdB);
    const now = Date.now();

    if (devA) {
      devA.localPeerTable[robotIdB] = {
        robotId: robotIdB,
        macAddress: getVirtualMacAddress(robotIdB),
        channel,
        rssi: -55,
        status: 'PAIRED',
        lastSeen: now,
      };
    }

    if (devB) {
      devB.localPeerTable[robotIdA] = {
        robotId: robotIdA,
        macAddress: getVirtualMacAddress(robotIdA),
        channel,
        rssi: -55,
        status: 'PAIRED',
        lastSeen: now,
      };
    }
  }

  /**
   * Returns virtual device info for a robot.
   */
  getDevice(robotId: string): VirtualEsp32Device | undefined {
    return this.virtualDevices.get(robotId);
  }

  /**
   * Encapsulates a P2PMessage with ESP-NOW metadata before transmission.
   */
  prepareMessage(message: P2PMessage): P2PMessage {
    if (!message.espNow) {
      message.espNow = wrapEspNowPacket(message);
    }
    return message;
  }
}
