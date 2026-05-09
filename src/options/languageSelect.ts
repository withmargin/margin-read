import {
  filterLanguageOptions,
  findLanguageOption,
  formatLanguageOption,
  LANGUAGE_OPTIONS,
  type LanguageOption
} from "./languages";

export interface LanguageSelectController {
  setValue(value: string): void;
}

export interface LanguageSelectElements {
  input: HTMLInputElement;
  hiddenInput: HTMLInputElement;
  listbox: HTMLElement;
}

export function initializeLanguageSelect(elements: LanguageSelectElements, initialValue: string): LanguageSelectController {
  let options = LANGUAGE_OPTIONS;
  let activeIndex = -1;
  let open = false;

  const selectOption = (option: LanguageOption): void => {
    elements.hiddenInput.value = option.promptName;
    elements.input.value = formatLanguageOption(option);
    closeListbox();
  };

  const render = (query = elements.input.value): void => {
    options = filterLanguageOptions(query).slice(0, 8);
    activeIndex = options.length > 0 ? Math.max(activeIndex, 0) : -1;

    elements.listbox.replaceChildren(
      ...options.map((option, index) => {
        const item = document.createElement("button");
        item.id = getOptionId(index);
        item.type = "button";
        item.className = "language-option";
        item.setAttribute("role", "option");
        item.setAttribute("aria-selected", String(index === activeIndex));
        item.innerHTML = `<span>${option.nativeName}</span><small>${option.name} · ${option.code}</small>`;
        item.addEventListener("pointerdown", (event) => {
          event.preventDefault();
          selectOption(option);
        });
        return item;
      })
    );
    elements.input.setAttribute("aria-activedescendant", activeIndex >= 0 ? getOptionId(activeIndex) : "");
  };

  const openListbox = (): void => {
    open = true;
    elements.input.setAttribute("aria-expanded", "true");
    elements.listbox.hidden = false;
    render();
  };

  const closeListbox = (): void => {
    open = false;
    activeIndex = -1;
    elements.input.setAttribute("aria-expanded", "false");
    elements.input.removeAttribute("aria-activedescendant");
    elements.listbox.hidden = true;
  };

  elements.input.addEventListener("focus", openListbox);
  elements.input.addEventListener("input", () => {
    openListbox();
    activeIndex = 0;
    render();
  });
  elements.input.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!open) {
        openListbox();
        return;
      }
      activeIndex = Math.min(activeIndex + 1, options.length - 1);
      render();
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      render();
      return;
    }

    if (event.key === "Enter" && open && activeIndex >= 0) {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) {
        selectOption(option);
      }
      return;
    }

    if (event.key === "Escape") {
      closeListbox();
    }
  });

  document.addEventListener("pointerdown", (event) => {
    if (!elements.input.parentElement?.contains(event.target as Node)) {
      closeListbox();
    }
  });

  const setValue = (value: string): void => {
    const option = findLanguageOption(value);
    if (option) {
      selectOption(option);
      return;
    }
    elements.hiddenInput.value = value;
    elements.input.value = value;
  };

  setValue(initialValue);

  return { setValue };
}

function getOptionId(index: number): string {
  return `target-language-option-${index}`;
}
