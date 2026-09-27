"use client";

import { AuthView, type AuthViewPath } from "@neondatabase/auth-ui";
import { Eye, EyeOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const managedPasswordAttribute = "data-tripping-password-toggle";
const labeledNativeToggleAttribute = "data-tripping-labeled-password-toggle";

function labelPasswordToggle(button: HTMLButtonElement, input: HTMLInputElement) {
  const label = input.type === "text" ? "Hide password" : "Show password";
  button.setAttribute("aria-label", label);
  button.setAttribute("title", label);
}

function PasswordVisibilityToggle({ input }: { input: HTMLInputElement }) {
  const [visible, setVisible] = useState(input.type === "text");
  const parent = input.parentElement;

  useEffect(() => {
    input.setAttribute(managedPasswordAttribute, "true");
    input.classList.add("pr-10");

    return () => {
      input.setAttribute("type", "password");
      input.removeAttribute(managedPasswordAttribute);
      input.classList.remove("pr-10");
    };
  }, [input]);

  if (!parent) return null;

  const label = visible ? "Hide password" : "Show password";

  return createPortal(
    <button
      type="button"
      className="absolute right-0 top-0 flex size-9 items-center justify-center rounded-md bg-transparent text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
      aria-label={label}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => {
        const nextVisible = !visible;
        input.setAttribute("type", nextVisible ? "text" : "password");
        setVisible(nextVisible);
        input.focus();
      }}
    >
      {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
    </button>,
    parent,
  );
}

export function AuthPanel({ path }: { path: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [passwordInputs, setPasswordInputs] = useState<HTMLInputElement[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const findPasswordInputs = () => {
      const inputs = Array.from(
        root.querySelectorAll<HTMLInputElement>(`input[type="password"], input[${managedPasswordAttribute}]`),
      ).filter((input) => {
        if (input.hasAttribute(managedPasswordAttribute)) return true;

        const nativeToggle = input.parentElement?.querySelector("button");
        if (!nativeToggle) return true;

        labelPasswordToggle(nativeToggle, input);
        if (!nativeToggle.hasAttribute(labeledNativeToggleAttribute)) {
          nativeToggle.setAttribute(labeledNativeToggleAttribute, "true");
          nativeToggle.addEventListener("click", () => {
            requestAnimationFrame(() => labelPasswordToggle(nativeToggle, input));
          });
        }
        return false;
      });

      setPasswordInputs((current) => (
        current.length === inputs.length && current.every((input, index) => input === inputs[index]) ? current : inputs
      ));
    };

    findPasswordInputs();
    const observer = new MutationObserver(findPasswordInputs);
    observer.observe(root, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [path]);

  return (
    <div ref={rootRef} className="pt-1">
      <AuthView path={path as AuthViewPath} />
      {passwordInputs.map((input) => <PasswordVisibilityToggle key={input.id || input.name} input={input} />)}
    </div>
  );
}
