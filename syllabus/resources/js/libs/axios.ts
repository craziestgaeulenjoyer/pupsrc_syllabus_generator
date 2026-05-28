import axios from 'axios';

axios.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            // Show modal or use a simple confirm
            const modal = document.createElement('div');
            modal.innerHTML = `
                <div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;">
                    <div style="background:white;padding:2rem;border-radius:8px;text-align:center;max-width:360px;">
                        <p style="margin-bottom:1.5rem;font-size:1rem;">Session expired. Please log in again.</p>
                        <button id="session-ok-btn" style="background:#800000;color:white;padding:0.5rem 2rem;border:none;border-radius:4px;cursor:pointer;font-size:1rem;">OK</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            document.getElementById('session-ok-btn')!.onclick = () => {
                window.location.href = '/login';
            };
        }
        return Promise.reject(error);
    }
);

export default axios;