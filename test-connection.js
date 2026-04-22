const { db } = require('./firebaseAdmin');

async function testConnection() {
  try {
    console.log('Testing Firebase connection...');
    
    // Try to add a test document
    const testDoc = await db.collection('test').add({
      message: 'Firebase is connected!',
      timestamp: new Date()
    });
    
    console.log('✅ SUCCESS! Firebase is connected!');
    console.log('📄 Test document ID:', testDoc.id);
    console.log('🎉 Your app is ready to use!');
    
  } catch (error) {
    console.error('❌ ERROR: Firebase connection failed!');
    console.error('Error details:', error.message);
  }
}

testConnection();