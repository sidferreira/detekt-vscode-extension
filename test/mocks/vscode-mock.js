"use strict";
// Mock VS Code API for unit tests
Object.defineProperty(exports, "__esModule", { value: true });
exports.vscode = exports.Diagnostic = exports.DiagnosticSeverity = exports.Range = exports.Position = exports.Uri = void 0;
class Uri {
    constructor(scheme, authority, path) {
        this.scheme = scheme;
        this.authority = authority;
        this.path = path;
        this.fsPath = path;
    }
    static file(path) {
        return new Uri('file', '', path);
    }
    toString() {
        return `${this.scheme}://${this.authority}${this.path}`;
    }
}
exports.Uri = Uri;
class Position {
    constructor(line, character) {
        this.line = line;
        this.character = character;
    }
}
exports.Position = Position;
class Range {
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
}
exports.Range = Range;
var DiagnosticSeverity;
(function (DiagnosticSeverity) {
    DiagnosticSeverity[DiagnosticSeverity["Error"] = 0] = "Error";
    DiagnosticSeverity[DiagnosticSeverity["Warning"] = 1] = "Warning";
    DiagnosticSeverity[DiagnosticSeverity["Information"] = 2] = "Information";
    DiagnosticSeverity[DiagnosticSeverity["Hint"] = 3] = "Hint";
})(DiagnosticSeverity = exports.DiagnosticSeverity || (exports.DiagnosticSeverity = {}));
class Diagnostic {
    constructor(range, message, severity) {
        this.range = range;
        this.message = message;
        this.severity = severity;
    }
}
exports.Diagnostic = Diagnostic;
exports.vscode = {
    Uri,
    Position,
    Range,
    Diagnostic,
    DiagnosticSeverity
};
//# sourceMappingURL=vscode-mock.js.map