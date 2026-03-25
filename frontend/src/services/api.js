import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api'; // Adjust to your backend port

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Token
apiClient.interceptors.request.use(
  (config) => {
    // Note: In a real app, read token from Zustand store here
    // For simplicity in this file, we assume you might pass it or read from localStorage
    const token = localStorage.getItem('gvc-auth-storage');
    if (token) {
      const parsed = JSON.parse(token);
      if (parsed.state?.token) {
        config.headers.Authorization = `Bearer ${parsed.state.token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle Global Errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized logout logic here
      console.error('Unauthorized access');
    }
    return Promise.reject(error);
  }
);

export default apiClient;TOKEN=<jwt>
BASE=http://localhost:3000/api

curl -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"student_pk":1,"offering_id":1,"level_id":1,"status":"ENROLLED"}' \
  $BASE/enrollment

curl -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"DROPPED"}' \
  $BASE/enrollment/1

curl -X DELETE -H "Authorization: Bearer $TOKEN" $BASE/enrollment/1

curl -H "Authorization: Bearer $TOKEN" $BASE/enrollment?student_pk=1

curl -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"student_pk":1,"offering_id":1,"assessment_scores":[{"name":"Overall","weight":100,"score":78}],"total_score":78,"final_score":78}' \
  $BASE/grading/grades

curl -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"rows":[{"student_pk":1,"offering_id":1,"assessment_scores":[{"name":"Overall","weight":100,"score":85}]}]}' \
  $BASE/grading/grades/bulk

curl -H "Authorization: Bearer $TOKEN" $BASE/enrollment/gpa/1/1