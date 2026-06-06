const assert = require('assert');
const fs = require('fs');
const Module = require('module');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const indexPath = path.join(rootDir, 'index.js');
const source = fs.readFileSync(indexPath, 'utf8');

assert(!source.includes('Service.BatteryService'), 'Homebridge 2 removed Service.BatteryService; use Service.Battery');
assert(!source.includes("require('mkdirp')"), 'mkdirp should not be required');

const originalLoad = Module._load;
Module._load = function(request, parent, isMain) {
  if (request === 'miio') {
    return {
      device() {
        return Promise.reject(new Error('stubbed miio device'));
      },
    };
  }
  return originalLoad.call(this, request, parent, isMain);
};

function serviceConstructor(name) {
  return class StubService {
    constructor(displayName, subtype) {
      this.displayName = displayName;
      this.subtype = subtype;
    }

    setCharacteristic() {
      return this;
    }

    getCharacteristic() {
      return this;
    }

    addCharacteristic() {
      return this;
    }

    on() {
      return this;
    }

    updateValue() {
      return this;
    }
  };
}

function StubAccessory(displayName, uuid, category) {
  this.displayName = displayName;
  this.UUID = uuid;
  this.category = category;
  this.services = [];
}

StubAccessory.prototype.getService = function() {
  return null;
};

StubAccessory.prototype.addService = function(service) {
  this.services.push(service);
};

StubAccessory.prototype.removeService = function() {};

const Service = {
  AccessoryInformation: serviceConstructor('AccessoryInformation'),
  Fanv2: serviceConstructor('Fanv2'),
  Switch: serviceConstructor('Switch'),
  Lightbulb: serviceConstructor('Lightbulb'),
  TemperatureSensor: serviceConstructor('TemperatureSensor'),
  HumiditySensor: serviceConstructor('HumiditySensor'),
  Battery: serviceConstructor('Battery'),
};

const Characteristic = {
  Active: {ACTIVE: 1, INACTIVE: 0},
  Brightness: serviceConstructor('Brightness'),
  BatteryLevel: {},
  ChargingState: {NOT_CHARGING: 2},
  CurrentFanState: {INACTIVE: 0, IDLE: 1, BLOWING_AIR: 2},
  CurrentRelativeHumidity: {},
  CurrentTemperature: {},
  FirmwareRevision: {},
  LockPhysicalControls: {CONTROL_LOCK_DISABLED: 0, CONTROL_LOCK_ENABLED: 1},
  Manufacturer: {},
  Model: {},
  Name: {},
  On: {},
  RotationDirection: {CLOCKWISE: 0, COUNTER_CLOCKWISE: 1},
  RotationSpeed: {},
  SerialNumber: {},
  StatusFault: {NO_FAULT: 0},
  StatusLowBattery: {BATTERY_LEVEL_NORMAL: 0, BATTERY_LEVEL_LOW: 1},
  StatusTampered: {NOT_TAMPERED: 0},
  SwingMode: {SWING_DISABLED: 0, SWING_ENABLED: 1},
};

const registrations = [];
const homebridge = {
  hap: {
    Service,
    Characteristic,
    Accessory: {},
    Categories: {FAN: 3},
    uuid: {
      generate(input) {
        return `uuid-${input}`;
      },
    },
  },
  platformAccessory: StubAccessory,
  registerPlatform(pluginName, platformName, platformConstructor, dynamic) {
    registrations.push({pluginName, platformName, platformConstructor, dynamic});
  },
};

require(indexPath)(homebridge);

assert.strictEqual(registrations.length, 1, 'plugin should register exactly one platform');
assert.strictEqual(registrations[0].pluginName, 'homebridge-xiaomi-fan');
assert.strictEqual(registrations[0].platformName, 'xiaomifan');
assert.strictEqual(registrations[0].dynamic, true);

Module._load = originalLoad;

console.log('Homebridge 2 smoke test passed');
