const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Firebase config - you should use your actual config
const firebaseConfig = {
  // Add your Firebase config here
  // This should match the config in your lib/firebase.ts file
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function setupAdmin() {
  const adminEmail = 'admin@telehealth.com';
  const adminPassword = 'Admin@123456';
  
  try {
    console.log('Creating admin account...');
    
    // Create admin user
    const userCredential = await createUserWithEmailAndPassword(auth, adminEmail, adminPassword);
    const user = userCredential.user;
    
    // Create admin document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      displayName: 'System Administrator',
      email: adminEmail,
      role: 'admin',
      createdAt: new Date(),
      photoURL: null
    });
    
    console.log('✅ Admin account created successfully!');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('⚠️  Please change the password after first login');
    
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('ℹ️  Admin account already exists');
    } else {
      console.error('❌ Error creating admin account:', error.message);
    }
  }
  
  process.exit(0);
}

setupAdmin();