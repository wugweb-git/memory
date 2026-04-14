async function checkLinkHealth(url) {
  if (!url) {
    return 'broken';
  }

  try {
    const response = await fetch(url, { method: 'GET' });
    return response.ok ? 'active' : 'broken';
  } catch (error) {
    return 'broken';
  }
}

export { checkLinkHealth };
