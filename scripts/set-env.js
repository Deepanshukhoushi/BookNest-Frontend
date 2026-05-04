const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env
const envPath = path.resolve(__dirname, '../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn('⚠️ No .env file found at ' + envPath + '. Using default values.');
}

const apiBaseUrl = process.env.NG_APP_API_BASE_URL || 'http://localhost:8080/api/v1';
const razorpayKey = process.env.NG_APP_RAZORPAY_KEY || '';
const taxRate = process.env.NG_APP_TAX_RATE || '0.08';
const shippingThreshold = process.env.NG_APP_SHIPPING_THRESHOLD || '250';
const baseShipping = process.env.NG_APP_BASE_SHIPPING || '12.00';
const defaultAvatar = process.env.NG_APP_DEFAULT_AVATAR || '';

const envConfigFile = `export const environment = {
  production: false,
  apiBaseUrl: '${apiBaseUrl}',
  razorpayKey: '${razorpayKey}',
  taxRate: ${taxRate},
  shippingThreshold: ${shippingThreshold},
  baseShipping: ${baseShipping},
  defaultAvatar: '${defaultAvatar}'
};
`;

const prodEnvConfigFile = `export const environment = {
  production: true,
  apiBaseUrl: '${apiBaseUrl}',
  razorpayKey: '${razorpayKey}',
  taxRate: ${taxRate},
  shippingThreshold: ${shippingThreshold},
  baseShipping: ${baseShipping},
  defaultAvatar: '${defaultAvatar}'
};
`;

const targetPath = path.resolve(__dirname, '../src/environments/environment.ts');
const prodTargetPath = path.resolve(__dirname, '../src/environments/environment.prod.ts');

// Create environments directory if it doesn't exist
const envDir = path.resolve(__dirname, '../src/environments');
if (!fs.existsSync(envDir)) {
  fs.mkdirSync(envDir, { recursive: true });
}

fs.writeFileSync(targetPath, envConfigFile);
fs.writeFileSync(prodTargetPath, prodEnvConfigFile);

console.log('✅ Angular environment files generated successfully.');
