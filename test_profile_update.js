const fetch = require('node-fetch');

// First, we need to login to get a session
async function testProfileUpdate() {
  try {
    console.log('Logging in to get a session...');
    const loginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'samule',
        password: 'samule',
      }),
      redirect: 'manual',
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.statusText}`);
    }

    // Keep the cookies from the response
    const cookies = loginResponse.headers.raw()['set-cookie'];
    console.log('Login successful. Cookies:', cookies);

    // Now, try updating the profile with new data
    console.log('Updating profile...');
    const profileData = {
      age: 30,
      gender: 'Male',
      fitnessGoals: ['Build Muscle', 'Lose Weight'],
      gymPreferences: ['Free Weights', 'Cardio'],
      bodyMeasurements: {
        height: '180 cm',
        weight: '75 kg',
      },
    };

    const updateResponse = await fetch('http://localhost:5000/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies.join('; '),
      },
      body: JSON.stringify(profileData),
      redirect: 'manual',
    });

    if (!updateResponse.ok) {
      throw new Error(`Profile update failed: ${updateResponse.statusText}`);
    }

    const updatedUser = await updateResponse.json();
    console.log('Profile updated successfully:', JSON.stringify(updatedUser, null, 2));

    // Verify data is persisted by fetching user profile
    console.log('Fetching user profile to verify...');
    const verifyResponse = await fetch('http://localhost:5000/api/user', {
      headers: {
        'Cookie': cookies.join('; '),
      },
      redirect: 'manual',
    });

    if (!verifyResponse.ok) {
      throw new Error(`Verification failed: ${verifyResponse.statusText}`);
    }

    const verifiedUser = await verifyResponse.json();
    console.log('Verified user profile:', JSON.stringify(verifiedUser, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testProfileUpdate();