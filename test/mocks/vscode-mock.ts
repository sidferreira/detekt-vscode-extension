// Mock VS Code API for unit tests

export class Uri {
    public fsPath: string;

    private constructor(public scheme: string, public authority: string, public path: string) {
        this.fsPath = path;
    }

    static file(path: string): Uri {
        return new Uri('file', '', path);
    }

    toString(): string {
        return `${this.scheme}://${this.authority}${this.path}`;
    }
}

export class Position {
    constructor(public line: number, public character: number) {}
}

export class Range {
    constructor(public start: Position, public end: Position) {}
}

export enum DiagnosticSeverity {
    Error = 0,
    Warning = 1,
    Information = 2,
    Hint = 3
}

export class Diagnostic {
    public code?: string | number;
    public source?: string;

    constructor(
        public range: Range,
        public message: string,
        public severity?: DiagnosticSeverity
    ) {}
}

export const vscode = {
    Uri,
    Position,
    Range,
    Diagnostic,
    DiagnosticSeverity
};
