/*
  Copyright (c) Microsoft Corporation.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

import React from 'react';

import type { EffectCallback } from 'react';

// Recalculates the value when dependencies change.
export function useAsyncMemo<T>(fn: () => Promise<T>, deps: React.DependencyList, initialValue: T, resetValue?: T) {
  const [value, setValue] = React.useState<T>(initialValue);
  React.useEffect(() => {
    let canceled = false;
    if (resetValue !== undefined)
      setValue(resetValue);
    fn().then(value => {
      if (!canceled)
        setValue(value);
    });
    return () => {
      canceled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}

// Tracks the element size and returns it's contentRect (always has x=0, y=0).
export function useMeasure<T extends Element>() {
  const ref = React.useRef<T | null>(null);
  const [measure, setMeasure] = React.useState(new DOMRect(0, 0, 10, 10));
  React.useLayoutEffect(() => {
    const target = ref.current;
    if (!target)
      return;

    const bounds = target.getBoundingClientRect();

    setMeasure(new DOMRect(0, 0, bounds.width, bounds.height));

    const resizeObserver = new ResizeObserver((entries: any) => {
      const entry = entries[entries.length - 1];
      if (entry && entry.contentRect)
        setMeasure(entry.contentRect);
    });
    resizeObserver.observe(target);
    return () => resizeObserver.disconnect();
  }, [ref]);
  return [measure, ref] as const;
}

export function msToString(ms: number): string {
  if (ms < 0 || !isFinite(ms))
    return '-';

  if (ms === 0)
    return '0';

  if (ms < 1000)
    return ms.toFixed(0) + 'ms';

  const seconds = ms / 1000;
  if (seconds < 60)
    return seconds.toFixed(1) + 's';

  const minutes = seconds / 60;
  if (minutes < 60)
    return minutes.toFixed(1) + 'm';

  const hours = minutes / 60;
  if (hours < 24)
    return hours.toFixed(1) + 'h';

  const days = hours / 24;
  return days.toFixed(1) + 'd';
}

export function bytesToString(bytes: number): string {
  if (bytes < 0 || !isFinite(bytes))
    return '-';

  if (bytes === 0)
    return '0';

  if (bytes < 1000)
    return bytes.toFixed(0);

  const kb = bytes / 1024;
  if (kb < 1000)
    return kb.toFixed(1) + 'K';

  const mb = kb / 1024;
  if (mb < 1000)
    return mb.toFixed(1) + 'M';

  const gb = mb / 1024;
  return gb.toFixed(1) + 'G';
}

export function lowerBound<S, T>(array: S[], object: T, comparator: (object: T, b: S) => number, left?: number, right?: number): number {
  let l = left || 0;
  let r = right !== undefined ? right : array.length;
  while (l < r) {
    const m = (l + r) >> 1;
    if (comparator(object, array[m]) > 0)
      l = m + 1;
    else
      r = m;
  }
  return r;
}

export function upperBound<S, T>(array: S[], object: T, comparator: (object: T, b: S) => number, left?: number, right?: number): number {
  let l = left || 0;
  let r = right !== undefined ? right : array.length;
  while (l < r) {
    const m = (l + r) >> 1;
    if (comparator(object, array[m]) >= 0)
      l = m + 1;
    else
      r = m;
  }
  return r;
}

export function copy(text: string) {
  const textArea = document.createElement('textarea');
  textArea.style.position = 'absolute';
  textArea.style.zIndex = '-1000';
  textArea.value = text;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  textArea.remove();
}

export function useSetting<S>(name: string | undefined, defaultValue: S): [S, React.Dispatch<React.SetStateAction<S>>] {
  if (name)
    defaultValue = settings.getObject(name, defaultValue);
  const [value, setValue] = React.useState<S>(defaultValue);
  const setValueWrapper = React.useCallback((value: React.SetStateAction<S>) => {
    if (name)
      settings.setObject(name, value);
    else
      setValue(value);
  }, [name, setValue]);

  React.useEffect(() => {
    if (name) {
      const onStoreChange = () => setValue(settings.getObject(name, defaultValue));
      settings.onChangeEmitter.addEventListener(name, onStoreChange);
      return () => settings.onChangeEmitter.removeEventListener(name, onStoreChange);
    }
  }, [defaultValue, name]);
  return [value, setValueWrapper];
}

declare global {
  interface Window {
    saveSettings?(): void;
  }
}

export class Settings {
  onChangeEmitter = new EventTarget();

  getString(name: string, defaultValue: string): string {
    return localStorage[name] || defaultValue;
  }

  setString(name: string, value: string) {
    localStorage[name] = value;
    this.onChangeEmitter.dispatchEvent(new Event(name));
    window.saveSettings?.();
  }

  getObject<T>(name: string, defaultValue: T): T {
    if (!localStorage[name])
      return defaultValue;
    try {
      return JSON.parse(localStorage[name]);
    } catch {
      return defaultValue;
    }
  }

  setObject<T>(name: string, value: T) {
    localStorage[name] = JSON.stringify(value);
    this.onChangeEmitter.dispatchEvent(new Event(name));
    window.saveSettings?.();
  }
}

export const settings = new Settings();

// inspired by https://www.npmjs.com/package/clsx
export function clsx(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export async function sha1(str: string): Promise<string> {
  const buffer = new TextEncoder().encode(str);
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1', buffer))).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function scrollIntoViewIfNeeded(element: Element | undefined) {
  if (!element)
    return;
  if ((element as any)?.scrollIntoViewIfNeeded)
    (element as any).scrollIntoViewIfNeeded(false);
  else
    element?.scrollIntoView();
}

const kControlCodesRe = '\\u0000-\\u0020\\u007f-\\u009f';
export const kWebLinkRe = new RegExp('(?:[a-zA-Z][a-zA-Z0-9+.-]{2,}:\\/\\/|www\\.)[^\\s' + kControlCodesRe + '"]{2,}[^\\s' + kControlCodesRe + '"\')}\\],:;.!?]', 'ug');

/**
 * Manages flash animation state.
 * Calling `trigger` will turn `flash` to true for a second, and then back to false.
 * If `trigger` is called while a flash is ongoing, the ongoing flash will be cancelled and after 50ms a new flash is started.
 * @returns [flash, trigger]
 */
export function useFlash(): [boolean, EffectCallback] {
  const [flash, setFlash] = React.useState(false);
  const trigger = React.useCallback<React.EffectCallback>(() => {
    const timeouts: any[] = [];
    setFlash(currentlyFlashing => {
      timeouts.push(setTimeout(() => setFlash(false), 1000));
      if (!currentlyFlashing)
        return true;

      timeouts.push(setTimeout(() => setFlash(true), 50));
      return false;
    });
    return () => timeouts.forEach(clearTimeout);
  }, [setFlash]);
  return [flash, trigger];
}

export function useCookies() {
  const cookies = React.useMemo(() => {
    return document.cookie.split('; ').filter(v => v.includes('=')).map(kv => {
      const separator = kv.indexOf('=');
      return [kv.substring(0, separator), kv.substring(separator + 1)];
    });
  }, []);
  return cookies;
}
