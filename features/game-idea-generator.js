// AI-powered game idea generator with whimsical themes
// This feature will generate creative game ideas with unique themes using OpenAI's API

// Function to generate a game idea using OpenAI
async function generateGameIdea() {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'Generate a whimsical and creative game idea with a unique theme. Format it as a JSON object with the following properties: title, description, mainCharacter, setting, mechanics, twist. Make it suitable for casual players and keep the description concise.',
        modelConfig: {
          model: 'gpt-4o'
        }
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate game idea');
    }

    const data = await response.json();
    console.log('Generated game idea:', data);
    return data;
  } catch (error) {
    console.error('Error generating game idea:', error);
    return null;
  }
}

// Test the function
generateGameIdea().then(idea => {
  console.log('Game idea generation test complete');
});