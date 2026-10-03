import crypto from 'crypto';

let publicKey = '';
let privateKey = '';

// Generate RSA key pair on startup
export const initCrypto = () => {
  const keys = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
  });
  publicKey = keys.publicKey;
  privateKey = keys.privateKey;
  console.log('RSA Keys generated for session.');
};

export const getPublicKey = () => publicKey;

export const decryptRSA = (base64String) => {
  const buffer = Buffer.from(base64String, 'base64');
  const decrypted = crypto.privateDecrypt(
    { key: privateKey, padding: crypto.constants.RSA_PKCS1_PADDING },
    buffer
  );
  return decrypted.toString('utf8'); // returns the hex string of AES key/IV
};

export const decryptAES = (encryptedPayloadBase64, aesKeyHex, ivHex) => {
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(aesKeyHex, 'hex'),
    Buffer.from(ivHex, 'hex')
  );
  let decrypted = decipher.update(encryptedPayloadBase64, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return JSON.parse(decrypted);
};
