import md5 from "blueimp-md5";
import { appState } from "../state/appState.js";
import { authApi } from "../api/authApi.js";
import { session } from "../utils/session.js";
import { toast } from "../utils/toast.js";
import padoLogo from "../assets/pado_marcas_rgb_Principal.svg";
import fd500 from "../assets/fd-500.png";
import fde250 from "../assets/fde-250.png";
import fde300w from "../assets/fde-300w.png";
import fde600w from "../assets/fde-600w.png";
import fde800 from "../assets/fde-800.png";
import fdv201 from "../assets/fdv-201.png";


const LOCK_SLIDES = [
  { src: fdv201, label: "FDV-201" },
  { src: fde250, label: "FDE-250" },
  { src: fde300w, label: "FDE-300W" },
  { src: fde600w, label: "FDE-600W" },
  { src: fde800, label: "FDE-800" },
  { src: fd500, label: "FD-500" },
];

const CAROUSEL_INTERVAL_MS = 4000;

export class LoginScreen {
  constructor(onLoginSuccess) {
    this.container = document.getElementById("login-screen");
    this.usernameInput = document.getElementById("username");
    this.passwordInput = document.getElementById("password");
    this.enterButton = document.getElementById("btn-enter-app");
    this.togglePasswordBtn = document.getElementById("toggle-password");
    this.logoImg = document.getElementById("login-logo");
    this.logoImgMobile = document.getElementById("login-logo-mobile");
    this.carouselViewport = document.getElementById("login-carousel-viewport");
    this.carouselCaption = document.getElementById("login-carousel-caption");
    this.carouselDots = document.getElementById("login-carousel-dots");

    if (this.logoImg) this.logoImg.src = padoLogo;
    if (this.logoImgMobile) this.logoImgMobile.src = padoLogo;

    this._carouselIndex = 0;
    this._carouselTimer = null;
    this._buildCarousel();

    this.onLoginSuccess = onLoginSuccess;
    this.bindEvents();
  }


  _buildCarousel() {
    if (!this.carouselViewport || !this.carouselDots) return;

    this._slideEls = LOCK_SLIDES.map((slide, i) => {
      const img = document.createElement("img");
      img.src = slide.src;
      img.alt = slide.label;
      img.className =
        "absolute inset-0 h-full w-full object-contain transition-opacity duration-700 ease-in-out" +
        (i === 0 ? " opacity-100" : " opacity-0");
      this.carouselViewport.appendChild(img);
      return img;
    });

    this._dotEls = LOCK_SLIDES.map((_, i) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", `Ver ${LOCK_SLIDES[i].label}`);
      dot.className =
        "h-1.5 w-1.5 cursor-pointer rounded-full transition-all " +
        (i === 0 ? "bg-primary w-4" : "bg-white/30 hover:bg-white/60");
      dot.addEventListener("click", () => this._goToSlide(i));
      this.carouselDots.appendChild(dot);
      return dot;
    });

    if (this.carouselCaption) {
      this.carouselCaption.textContent = LOCK_SLIDES[0].label;
    }
  }

  _goToSlide(index) {
    if (!this._slideEls) return;
    this._slideEls[this._carouselIndex].classList.replace(
      "opacity-100",
      "opacity-0",
    );
    this._dotEls[this._carouselIndex].className =
      "h-1.5 w-1.5 cursor-pointer rounded-full transition-all bg-white/30 hover:bg-white/60";

    this._carouselIndex = index;

    this._slideEls[index].classList.replace("opacity-0", "opacity-100");
    this._dotEls[index].className =
      "h-1.5 w-4 cursor-pointer rounded-full transition-all bg-primary";
    if (this.carouselCaption) {
      this.carouselCaption.textContent = LOCK_SLIDES[index].label;
    }
  }

  _startCarousel() {
    this._stopCarousel();
    this._carouselTimer = setInterval(() => {
      this._goToSlide((this._carouselIndex + 1) % LOCK_SLIDES.length);
    }, CAROUSEL_INTERVAL_MS);
  }

  _stopCarousel() {
    if (this._carouselTimer) {
      clearInterval(this._carouselTimer);
      this._carouselTimer = null;
    }
  }

  bindEvents() {
    this.enterButton.addEventListener("click", () => this.handleLogin());

    if (this.togglePasswordBtn) {
      this.togglePasswordBtn.addEventListener("click", () =>
        this.togglePasswordVisibility(),
      );
    }

    const submitOnEnter = (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.handleLogin();
      }
    };
    
    if (this.usernameInput)
      this.usernameInput.addEventListener("keydown", submitOnEnter);
    if (this.passwordInput)
      this.passwordInput.addEventListener("keydown", submitOnEnter);
  }


  togglePasswordVisibility() {
    if (this.passwordInput.type === "password") {
      this.passwordInput.type = "text";
      this.togglePasswordBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"></path><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"></path><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"></path><line x1="2" y1="2" x2="22" y2="22"></line></svg>`;
    } else {
      this.passwordInput.type = "password";
      this.togglePasswordBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
    }
  }

  async handleLogin() {
    const username = this.usernameInput.value;
    const rawPassword = this.passwordInput.value;

    if (!username || !rawPassword) {
      toast.error("Por favor, insira as credenciais da sua conta.");
      return;
    }

    this.enterButton.innerText = "Conectando...";
    this.enterButton.disabled = true;

    const credentials = {
      username: username,
      password: md5(rawPassword),
    };

    try {
      const data = await authApi.login(credentials);

      if (data.access_token) {
        session.save(data.access_token);
        session.saveUser(data.localUserId, username);
        appState.setCredentials(username, credentials.password);
        this.hide();
        toast.success("Autenticação bem sucedida!");
        this.onLoginSuccess();
      } else {
        toast.error(
          "Falha no login: " + (data.description || "Cheque suas credenciais."),
        );
      }
    } catch (err) {
      toast.error("Falha de conexão com o servidor.");
      console.error(err);
    } finally {
      this.enterButton.innerText = "Entrar no Sistema";
      this.enterButton.disabled = false;
    }
  }

  show() {
    this.container.style.display = "flex";
    this._startCarousel();
  }
  hide() {
    this.container.style.display = "none";
    this._stopCarousel();
  }
}