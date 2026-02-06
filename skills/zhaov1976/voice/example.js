// Example usage of the Voice skill

async function example() {
  // Import the Voice skill
  const VoiceSkill = require('./index.js');
  const skill = new VoiceSkill();

  try {
    // Basic text-to-speech
    console.log('Creating basic speech...');
    let result = await skill.execute({
      action: 'tts',
      text: 'Hello, this is a demonstration of the voice skill.'
    });
    console.log(result.message);
    console.log('Media link:', result.media);

    // Advanced text-to-speech with options
    console.log('\nCreating speech with custom options...');
    result = await skill.execute({
      action: 'tts',
      text: 'This speech has custom speed and volume settings.',
      options: {
        voice: 'en-US-Wavenet-F',
        rate: '+20%',
        volume: '+10%'
      }
    });
    console.log(result.message);
    console.log('Media link:', result.media);

    // Clean up temporary files
    console.log('\nCleaning up temporary files...');
    result = await skill.execute({
      action: 'cleanup',
      options: {
        hoursOld: 1  // Only clean files older than 1 hour
      }
    });
    console.log(result.message);

  } catch (error) {
    console.error('Error during execution:', error.message);
  }
}

// Uncomment the next line to run the example
// example();

module.exports = VoiceSkill;