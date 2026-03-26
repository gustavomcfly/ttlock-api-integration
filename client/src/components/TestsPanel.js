export class TestsPanel {
  constructor() {
    this.cardQuality = document.getElementById("card-select-quality");
    this.cardCycling = document.getElementById("card-select-cycling");

    this.containerQuality = document.getElementById("container-test-quality");
    this.containerCycling = document.getElementById("container-test-cycling");

    this.bindEvents();
  }

  bindEvents() {
    if (this.cardQuality) {
      this.cardQuality.addEventListener("click", () =>
        this.selectTest("quality"),
      );
    }
    if (this.cardCycling) {
      this.cardCycling.addEventListener("click", () =>
        this.selectTest("cycling"),
      );
    }
  }

  selectTest(type) {
    // Reset both cards to inactive visual state
    this.cardQuality.classList.remove("border-primary", "bg-primary/5");
    this.cardQuality.classList.add("border-transparent");
    this.cardQuality
      .querySelector(".test-active-indicator")
      .classList.add("hidden");

    this.cardCycling.classList.remove("border-primary", "bg-primary/5");
    this.cardCycling.classList.add("border-transparent");
    this.cardCycling
      .querySelector(".test-active-indicator")
      .classList.add("hidden");

    // Hide both containers
    this.containerQuality.classList.add("hidden");
    this.containerCycling.classList.add("hidden");

    // Activate the selected one
    if (type === "quality") {
      this.cardQuality.classList.remove("border-transparent");
      this.cardQuality.classList.add("border-primary", "bg-primary/5");
      this.cardQuality
        .querySelector(".test-active-indicator")
        .classList.remove("hidden");
      this.containerQuality.classList.remove("hidden");
    } else if (type === "cycling") {
      this.cardCycling.classList.remove("border-transparent");
      this.cardCycling.classList.add("border-primary", "bg-primary/5");
      this.cardCycling
        .querySelector(".test-active-indicator")
        .classList.remove("hidden");
      this.containerCycling.classList.remove("hidden");
    }
  }

  // Called when navigating away from the page to clean up the UI
  reset() {
    this.cardQuality.classList.remove("border-primary", "bg-primary/5");
    this.cardQuality.classList.add("border-transparent");
    this.cardQuality
      .querySelector(".test-active-indicator")
      .classList.add("hidden");

    this.cardCycling.classList.remove("border-primary", "bg-primary/5");
    this.cardCycling.classList.add("border-transparent");
    this.cardCycling
      .querySelector(".test-active-indicator")
      .classList.add("hidden");

    this.containerQuality.classList.add("hidden");
    this.containerCycling.classList.add("hidden");
  }
}
