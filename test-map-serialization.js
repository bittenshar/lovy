// Quick test to verify Mongoose Map serialization
const mongoose = require('mongoose');

// Create a simple schema with Map
const testSchema = new mongoose.Schema({
  myMap: {
    type: Map,
    of: Number,
    default: new Map()
  }
});

const TestModel = mongoose.model('Test', testSchema);

// Create instance
const instance = new TestModel();
instance.myMap.set('user1', 1);
instance.myMap.set('user2', 2);

console.log('Original unreadCount:', instance.myMap);
console.log('Type:', instance.myMap instanceof Map);

// Convert to object
const obj = instance.toObject();
console.log('After toObject:', obj.myMap);
console.log('Type:', obj.myMap instanceof Map);

// Try JSON.stringify
try {
  const json = JSON.stringify(obj);
  console.log('JSON stringification successful');
  console.log('Result:', json);
} catch (e) {
  console.log('JSON stringification failed:', e.message);
}

// Try the conversion method
const unreadMap = {};
if (obj.myMap instanceof Map) {
  for (const [key, value] of obj.myMap) {
    unreadMap[key] = value;
  }
} else if (typeof obj.myMap === 'object') {
  Object.assign(unreadMap, obj.myMap);
}
obj.myMap = unreadMap;

console.log('After manual conversion:', obj.myMap);
console.log('JSON after conversion:', JSON.stringify(obj));
