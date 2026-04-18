import { ChangeDetectionStrategy, Component, computed, signal, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-root',
    templateUrl: './app.html',
    host: {
        '(window:keydown)': 'handleKeyDown($event)'
    }
})
export class App implements OnInit {
    rawCode = signal<string>('');
    removeExport = signal<boolean>(true);
    escapeSpecial = signal<boolean>(true);
    replaceQuotes = signal<boolean>(true);
    wrapJson = signal<boolean>(false);

    snippetName = signal<string>('My Snippet');
    snippetPrefix = signal<string>('prefix');
    snippetDesc = signal<string>('Snippet description');

    toastVisible = signal<boolean>(false);
    isDarkMode = signal<boolean>(true);

    constructor(@Inject(DOCUMENT) private document: Document, @Inject(PLATFORM_ID) private platformId: Object) { }

    ngOnInit() {
        if (isPlatformBrowser(this.platformId)) {
            const prefersLight = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersLight) {
                this.setTheme(true);
            }
        }
    }

    setTheme(isDark: boolean) {
        this.isDarkMode.set(isDark);
        if (isDark) {
            this.document.documentElement.classList.remove('light');
        } else {
            this.document.documentElement.classList.add('light');
        }
    }

    toggleTheme() {
        this.setTheme(!this.isDarkMode());
    }

    processedLines = computed(() => {
        const code = this.rawCode();
        if (!code.trim()) return [];

        const lines = code.split('\n');

        return lines.map(line => {
            let l = line;
            if (this.removeExport()) {
                l = l.replace(/^export\s+/, '');
            }

            if (this.escapeSpecial()) {
                l = l.replace(/\\/g, '\\\\');
                l = l.replace(/\$\{/g, '\\\\${');
            }

            if (this.replaceQuotes()) {
                l = l.replace(/"/g, "'");
            } else {
                l = l.replace(/"/g, '\\"');
            }

            return l;
        });
    });

    outputCode = computed(() => {
        const lines = this.processedLines();
        if (lines.length === 0) return '';

        if (this.wrapJson()) {
            const body = lines.map(l => `    "${l}"`).join(',\n');
            return `"${this.snippetName()}": {
  "prefix": "${this.snippetPrefix()}",
  "body": [
${body}
  ],
  "description": "${this.snippetDesc()}"
}`;
        } else {
            const out = lines.map(l => `"${l}",`).join('\n');
            return out.slice(0, -1); // remove the last comma
        }
    });

    lineCount = computed(() => {
        const code = this.rawCode();
        return code.trim() ? this.processedLines().length : 0;
    });
    charCount = computed(() => this.outputCode().length);

    updateRawCode(e: Event) {
        this.rawCode.set((e.target as HTMLTextAreaElement).value);
    }

    toggleSignal(sig: ReturnType<typeof signal<boolean>>) {
        sig.set(!sig());
    }

    updateStringSignal(sig: ReturnType<typeof signal<string>>, e: Event) {
        sig.set((e.target as HTMLInputElement).value);
    }

    clearInput() {
        this.rawCode.set('');
    }

    async copyToClipboard() {
        const out = this.outputCode();
        if (!out) return;

        try {
            await navigator.clipboard.writeText(out);
            this.showToast();
        } catch (err) {
            console.error('Failed to copy', err);
        }
    }

    showToast() {
        this.toastVisible.set(true);
        setTimeout(() => {
            this.toastVisible.set(false);
        }, 2000);
    }

    handleKeyDown(e: KeyboardEvent) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            e.preventDefault();
            this.copyToClipboard();
        }
    }
}
