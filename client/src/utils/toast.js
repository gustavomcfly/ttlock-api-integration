import Toastify from 'toastify-js';
import "toastify-js/src/toastify.css";

export const toast = {
    success(message) {
        Toastify({
            text: message,
            duration: 3000,
            close: true,
            gravity: "top", 
            position: "right", 
            style: {
                background: "linear-gradient(to right, #00b09b, #96c93d)",
                borderRadius: "8px",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
            }
        }).showToast();
    },

    error(message) {
        Toastify({
            text: message,
            duration: 4000,
            close: true,
            gravity: "top",
            position: "right",
            style: {
                background: "linear-gradient(to right, #ff5f6d, #ffc371)",
                borderRadius: "8px",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
            }
        }).showToast();
    },

    info(message) {
        Toastify({
            text: message,
            duration: 3000,
            close: true,
            gravity: "top",
            position: "right",
            style: {
                background: "linear-gradient(to right, #2193b0, #6dd5ed)",
                borderRadius: "8px",
                boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
            }
        }).showToast();
    }
};