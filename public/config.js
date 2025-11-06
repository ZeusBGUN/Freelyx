const API_URL = window.location.hostname === 'localhost'
    ? '${API_URL}'
    : '/api';

    console.log('API URL:', API_URL);