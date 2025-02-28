"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommonJsUsageWarnPlugin = void 0;
const path_1 = require("path");
const webpack_diagnostics_1 = require("../../../utils/webpack-diagnostics");
// Webpack doesn't export these so the deep imports can potentially break.
const AMDDefineDependency = require('webpack/lib/dependencies/AMDDefineDependency');
const CommonJsExportsDependency = require('webpack/lib/dependencies/CommonJsExportsDependency');
const CommonJsRequireDependency = require('webpack/lib/dependencies/CommonJsRequireDependency');
const CommonJsSelfReferenceDependency = require('webpack/lib/dependencies/CommonJsSelfReferenceDependency');
class CommonJsUsageWarnPlugin {
    constructor(options = {}) {
        this.options = options;
        this.shownWarnings = new Set();
        this.allowedDependencies = new Set(this.options.allowedDependencies);
    }
    apply(compiler) {
        compiler.hooks.compilation.tap('CommonJsUsageWarnPlugin', (compilation) => {
            compilation.hooks.finishModules.tap('CommonJsUsageWarnPlugin', (modules) => {
                const mainEntry = compilation.entries.get('main');
                if (!mainEntry) {
                    return;
                }
                const mainModules = new Set(mainEntry.dependencies.map((dep) => compilation.moduleGraph.getModule(dep)));
                for (const module of modules) {
                    const { dependencies, rawRequest } = module;
                    if (!rawRequest ||
                        rawRequest.startsWith('.') ||
                        (0, path_1.isAbsolute)(rawRequest) ||
                        this.allowedDependencies.has(rawRequest) ||
                        this.allowedDependencies.has(this.rawRequestToPackageName(rawRequest)) ||
                        rawRequest.startsWith('@angular/common/locales/')) {
                        /**
                         * Skip when:
                         * - module is absolute or relative.
                         * - module is allowed even if it's a CommonJS.
                         * - module is a locale imported from '@angular/common'.
                         */
                        continue;
                    }
                    if (this.hasCommonJsDependencies(compilation, dependencies)) {
                        // Dependency is CommonsJS or AMD.
                        const issuer = getIssuer(compilation, module);
                        // Check if it's parent issuer is also a CommonJS dependency.
                        // In case it is skip as an warning will be show for the parent CommonJS dependency.
                        const parentDependencies = getIssuer(compilation, issuer)?.dependencies;
                        if (parentDependencies &&
                            this.hasCommonJsDependencies(compilation, parentDependencies, true)) {
                            continue;
                        }
                        // Find the main issuer (entry-point).
                        let mainIssuer = issuer;
                        let nextIssuer = getIssuer(compilation, mainIssuer);
                        while (nextIssuer) {
                            mainIssuer = nextIssuer;
                            nextIssuer = getIssuer(compilation, mainIssuer);
                        }
                        // Only show warnings for modules from main entrypoint.
                        // And if the issuer request is not from 'webpack-dev-server', as 'webpack-dev-server'
                        // will require CommonJS libraries for live reloading such as 'sockjs-node'.
                        if (mainIssuer && mainModules.has(mainIssuer)) {
                            const warning = `${issuer?.userRequest} depends on '${rawRequest}'. ` +
                                'CommonJS or AMD dependencies can cause optimization bailouts.\n' +
                                'For more info see: https://angular.io/guide/build#configuring-commonjs-dependencies';
                            // Avoid showing the same warning multiple times when in 'watch' mode.
                            if (!this.shownWarnings.has(warning)) {
                                (0, webpack_diagnostics_1.addWarning)(compilation, warning);
                                this.shownWarnings.add(warning);
                            }
                        }
                    }
                }
            });
        });
    }
    hasCommonJsDependencies(compilation, dependencies, checkParentModules = false) {
        for (const dep of dependencies) {
            if (dep instanceof CommonJsRequireDependency ||
                dep instanceof CommonJsExportsDependency ||
                dep instanceof CommonJsSelfReferenceDependency ||
                dep instanceof AMDDefineDependency) {
                return true;
            }
            if (checkParentModules) {
                const module = getWebpackModule(compilation, dep);
                if (module && this.hasCommonJsDependencies(compilation, module.dependencies)) {
                    return true;
                }
            }
        }
        return false;
    }
    rawRequestToPackageName(rawRequest) {
        return rawRequest.startsWith('@')
            ? // Scoped request ex: @angular/common/locale/en -> @angular/common
                rawRequest.split('/', 2).join('/')
            : // Non-scoped request ex: lodash/isEmpty -> lodash
                rawRequest.split('/', 1)[0];
    }
}
exports.CommonJsUsageWarnPlugin = CommonJsUsageWarnPlugin;
function getIssuer(compilation, module) {
    if (!module) {
        return null;
    }
    return compilation.moduleGraph.getIssuer(module);
}
function getWebpackModule(compilation, dependency) {
    if (!dependency) {
        return null;
    }
    return compilation.moduleGraph.getModule(dependency);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbW9uLWpzLXVzYWdlLXdhcm4tcGx1Z2luLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhcl9kZXZraXQvYnVpbGRfYW5ndWxhci9zcmMvdG9vbHMvd2VicGFjay9wbHVnaW5zL2NvbW1vbi1qcy11c2FnZS13YXJuLXBsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCwrQkFBa0M7QUFFbEMsNEVBQWdFO0FBRWhFLDBFQUEwRTtBQUMxRSxNQUFNLG1CQUFtQixHQUFHLE9BQU8sQ0FBQyw4Q0FBOEMsQ0FBQyxDQUFDO0FBQ3BGLE1BQU0seUJBQXlCLEdBQUcsT0FBTyxDQUFDLG9EQUFvRCxDQUFDLENBQUM7QUFDaEcsTUFBTSx5QkFBeUIsR0FBRyxPQUFPLENBQUMsb0RBQW9ELENBQUMsQ0FBQztBQUNoRyxNQUFNLCtCQUErQixHQUFHLE9BQU8sQ0FBQywwREFBMEQsQ0FBQyxDQUFDO0FBTzVHLE1BQWEsdUJBQXVCO0lBSWxDLFlBQW9CLFVBQTBDLEVBQUU7UUFBNUMsWUFBTyxHQUFQLE9BQU8sQ0FBcUM7UUFIeEQsa0JBQWEsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBSXhDLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLG1CQUFtQixDQUFDLENBQUM7SUFDdkUsQ0FBQztJQUVELEtBQUssQ0FBQyxRQUFrQjtRQUN0QixRQUFRLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMseUJBQXlCLEVBQUUsQ0FBQyxXQUFXLEVBQUUsRUFBRTtZQUN4RSxXQUFXLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMseUJBQXlCLEVBQUUsQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFDekUsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FB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dHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgeyBpc0Fic29sdXRlIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBDb21waWxhdGlvbiwgQ29tcGlsZXIsIERlcGVuZGVuY3ksIE1vZHVsZSwgTm9ybWFsTW9kdWxlIH0gZnJvbSAnd2VicGFjayc7XG5pbXBvcnQgeyBhZGRXYXJuaW5nIH0gZnJvbSAnLi4vLi4vLi4vdXRpbHMvd2VicGFjay1kaWFnbm9zdGljcyc7XG5cbi8vIFdlYnBhY2sgZG9lc24ndCBleHBvcnQgdGhlc2Ugc28gdGhlIGRlZXAgaW1wb3J0cyBjYW4gcG90ZW50aWFsbHkgYnJlYWsuXG5jb25zdCBBTUREZWZpbmVEZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0FNRERlZmluZURlcGVuZGVuY3knKTtcbmNvbnN0IENvbW1vbkpzRXhwb3J0c0RlcGVuZGVuY3kgPSByZXF1aXJlKCd3ZWJwYWNrL2xpYi9kZXBlbmRlbmNpZXMvQ29tbW9uSnNFeHBvcnRzRGVwZW5kZW5jeScpO1xuY29uc3QgQ29tbW9uSnNSZXF1aXJlRGVwZW5kZW5jeSA9IHJlcXVpcmUoJ3dlYnBhY2svbGliL2RlcGVuZGVuY2llcy9Db21tb25Kc1JlcXVpcmVEZXBlbmRlbmN5Jyk7XG5jb25zdCBDb21tb25Kc1NlbGZSZWZlcmVuY2VEZXBlbmRlbmN5ID0gcmVxdWlyZSgnd2VicGFjay9saWIvZGVwZW5kZW5jaWVzL0NvbW1vbkpzU2VsZlJlZmVyZW5jZURlcGVuZGVuY3knKTtcblxuZXhwb3J0IGludGVyZmFjZSBDb21tb25Kc1VzYWdlV2FyblBsdWdpbk9wdGlvbnMge1xuICAvKiogQSBsaXN0IG9mIENvbW1vbkpTIHBhY2thZ2VzIHRoYXQgYXJlIGFsbG93ZWQgdG8gYmUgdXNlZCB3aXRob3V0IGEgd2FybmluZy4gKi9cbiAgYWxsb3dlZERlcGVuZGVuY2llcz86IHN0cmluZ1tdO1xufVxuXG5leHBvcnQgY2xhc3MgQ29tbW9uSnNVc2FnZVdhcm5QbHVnaW4ge1xuICBwcml2YXRlIHNob3duV2FybmluZ3MgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgcHJpdmF0ZSBhbGxvd2VkRGVwZW5kZW5jaWVzOiBTZXQ8c3RyaW5nPjtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIG9wdGlvbnM6IENvbW1vbkpzVXNhZ2VXYXJuUGx1Z2luT3B0aW9ucyA9IHt9KSB7XG4gICAgdGhpcy5hbGxvd2VkRGVwZW5kZW5jaWVzID0gbmV3IFNldCh0aGlzLm9wdGlvbnMuYWxsb3dlZERlcGVuZGVuY2llcyk7XG4gIH1cblxuICBhcHBseShjb21waWxlcjogQ29tcGlsZXIpIHtcbiAgICBjb21waWxlci5ob29rcy5jb21waWxhdGlvbi50YXAoJ0NvbW1vbkpzVXNhZ2VXYXJuUGx1Z2luJywgKGNvbXBpbGF0aW9uKSA9PiB7XG4gICAgICBjb21waWxhdGlvbi5ob29rcy5maW5pc2hNb2R1bGVzLnRhcCgnQ29tbW9uSnNVc2FnZVdhcm5QbHVnaW4nLCAobW9kdWxlcykgPT4ge1xuICAgICAgICBjb25zdCBtYWluRW50cnkgPSBjb21waWxhdGlvbi5lbnRyaWVzLmdldCgnbWFpbicpO1xuICAgICAgICBpZiAoIW1haW5FbnRyeSkge1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBtYWluTW9kdWxlcyA9IG5ldyBTZXQoXG4gICAgICAgICAgbWFpbkVudHJ5LmRlcGVuZGVuY2llcy5tYXAoKGRlcCkgPT4gY29tcGlsYXRpb24ubW9kdWxlR3JhcGguZ2V0TW9kdWxlKGRlcCkpLFxuICAgICAgICApO1xuXG4gICAgICAgIGZvciAoY29uc3QgbW9kdWxlIG9mIG1vZHVsZXMpIHtcbiAgICAgICAgICBjb25zdCB7IGRlcGVuZGVuY2llcywgcmF3UmVxdWVzdCB9ID0gbW9kdWxlIGFzIE5vcm1hbE1vZHVsZTtcbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAhcmF3UmVxdWVzdCB8fFxuICAgICAgICAgICAgcmF3UmVxdWVzdC5zdGFydHNXaXRoKCcuJykgfHxcbiAgICAgICAgICAgIGlzQWJzb2x1dGUocmF3UmVxdWVzdCkgfHxcbiAgICAgICAgICAgIHRoaXMuYWxsb3dlZERlcGVuZGVuY2llcy5oYXMocmF3UmVxdWVzdCkgfHxcbiAgICAgICAgICAgIHRoaXMuYWxsb3dlZERlcGVuZGVuY2llcy5oYXModGhpcy5yYXdSZXF1ZXN0VG9QYWNrYWdlTmFtZShyYXdSZXF1ZXN0KSkgfHxcbiAgICAgICAgICAgIHJhd1JlcXVlc3Quc3RhcnRzV2l0aCgnQGFuZ3VsYXIvY29tbW9uL2xvY2FsZXMvJylcbiAgICAgICAgICApIHtcbiAgICAgICAgICAgIC8qKlxuICAgICAgICAgICAgICogU2tpcCB3aGVuOlxuICAgICAgICAgICAgICogLSBtb2R1bGUgaXMgYWJzb2x1dGUgb3IgcmVsYXRpdmUuXG4gICAgICAgICAgICAgKiAtIG1vZHVsZSBpcyBhbGxvd2VkIGV2ZW4gaWYgaXQncyBhIENvbW1vbkpTLlxuICAgICAgICAgICAgICogLSBtb2R1bGUgaXMgYSBsb2NhbGUgaW1wb3J0ZWQgZnJvbSAnQGFuZ3VsYXIvY29tbW9uJy5cbiAgICAgICAgICAgICAqL1xuICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgaWYgKHRoaXMuaGFzQ29tbW9uSnNEZXBlbmRlbmNpZXMoY29tcGlsYXRpb24sIGRlcGVuZGVuY2llcykpIHtcbiAgICAgICAgICAgIC8vIERlcGVuZGVuY3kgaXMgQ29tbW9uc0pTIG9yIEFNRC5cbiAgICAgICAgICAgIGNvbnN0IGlzc3VlciA9IGdldElzc3Vlcihjb21waWxhdGlvbiwgbW9kdWxlKTtcbiAgICAgICAgICAgIC8vIENoZWNrIGlmIGl0J3MgcGFyZW50IGlzc3VlciBpcyBhbHNvIGEgQ29tbW9uSlMgZGVwZW5kZW5jeS5cbiAgICAgICAgICAgIC8vIEluIGNhc2UgaXQgaXMgc2tpcCBhcyBhbiB3YXJuaW5nIHdpbGwgYmUgc2hvdyBmb3IgdGhlIHBhcmVudCBDb21tb25KUyBkZXBlbmRlbmN5LlxuICAgICAgICAgICAgY29uc3QgcGFyZW50RGVwZW5kZW5jaWVzID0gZ2V0SXNzdWVyKGNvbXBpbGF0aW9uLCBpc3N1ZXIpPy5kZXBlbmRlbmNpZXM7XG4gICAgICAgICAgICBpZiAoXG4gICAgICAgICAgICAgIHBhcmVudERlcGVuZGVuY2llcyAmJlxuICAgICAgICAgICAgICB0aGlzLmhhc0NvbW1vbkpzRGVwZW5kZW5jaWVzKGNvbXBpbGF0aW9uLCBwYXJlbnREZXBlbmRlbmNpZXMsIHRydWUpXG4gICAgICAgICAgICApIHtcbiAgICAgICAgICAgICAgY29udGludWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIEZpbmQgdGhlIG1haW4gaXNzdWVyIChlbnRyeS1wb2ludCkuXG4gICAgICAgICAgICBsZXQgbWFpbklzc3VlciA9IGlzc3VlcjtcbiAgICAgICAgICAgIGxldCBuZXh0SXNzdWVyID0gZ2V0SXNzdWVyKGNvbXBpbGF0aW9uLCBtYWluSXNzdWVyKTtcbiAgICAgICAgICAgIHdoaWxlIChuZXh0SXNzdWVyKSB7XG4gICAgICAgICAgICAgIG1haW5Jc3N1ZXIgPSBuZXh0SXNzdWVyO1xuICAgICAgICAgICAgICBuZXh0SXNzdWVyID0gZ2V0SXNzdWVyKGNvbXBpbGF0aW9uLCBtYWluSXNzdWVyKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gT25seSBzaG93IHdhcm5pbmdzIGZvciBtb2R1bGVzIGZyb20gbWFpbiBlbnRyeXBvaW50LlxuICAgICAgICAgICAgLy8gQW5kIGlmIHRoZSBpc3N1ZXIgcmVxdWVzdCBpcyBub3QgZnJvbSAnd2VicGFjay1kZXYtc2VydmVyJywgYXMgJ3dlYnBhY2stZGV2LXNlcnZlcidcbiAgICAgICAgICAgIC8vIHdpbGwgcmVxdWlyZSBDb21tb25KUyBsaWJyYXJpZXMgZm9yIGxpdmUgcmVsb2FkaW5nIHN1Y2ggYXMgJ3NvY2tqcy1ub2RlJy5cbiAgICAgICAgICAgIGlmIChtYWluSXNzdWVyICYmIG1haW5Nb2R1bGVzLmhhcyhtYWluSXNzdWVyKSkge1xuICAgICAgICAgICAgICBjb25zdCB3YXJuaW5nID1cbiAgICAgICAgICAgICAgICBgJHsoaXNzdWVyIGFzIE5vcm1hbE1vZHVsZSB8IG51bGwpPy51c2VyUmVxdWVzdH0gZGVwZW5kcyBvbiAnJHtyYXdSZXF1ZXN0fScuIGAgK1xuICAgICAgICAgICAgICAgICdDb21tb25KUyBvciBBTUQgZGVwZW5kZW5jaWVzIGNhbiBjYXVzZSBvcHRpbWl6YXRpb24gYmFpbG91dHMuXFxuJyArXG4gICAgICAgICAgICAgICAgJ0ZvciBtb3JlIGluZm8gc2VlOiBodHRwczovL2FuZ3VsYXIuaW8vZ3VpZGUvYnVpbGQjY29uZmlndXJpbmctY29tbW9uanMtZGVwZW5kZW5jaWVzJztcblxuICAgICAgICAgICAgICAvLyBBdm9pZCBzaG93aW5nIHRoZSBzYW1lIHdhcm5pbmcgbXVsdGlwbGUgdGltZXMgd2hlbiBpbiAnd2F0Y2gnIG1vZGUuXG4gICAgICAgICAgICAgIGlmICghdGhpcy5zaG93bldhcm5pbmdzLmhhcyh3YXJuaW5nKSkge1xuICAgICAgICAgICAgICAgIGFkZFdhcm5pbmcoY29tcGlsYXRpb24sIHdhcm5pbmcpO1xuICAgICAgICAgICAgICAgIHRoaXMuc2hvd25XYXJuaW5ncy5hZGQod2FybmluZyk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH0pO1xuICB9XG5cbiAgcHJpdmF0ZSBoYXNDb21tb25Kc0RlcGVuZGVuY2llcyhcbiAgICBjb21waWxhdGlvbjogQ29tcGlsYXRpb24sXG4gICAgZGVwZW5kZW5jaWVzOiBEZXBlbmRlbmN5W10sXG4gICAgY2hlY2tQYXJlbnRNb2R1bGVzID0gZmFsc2UsXG4gICk6IGJvb2xlYW4ge1xuICAgIGZvciAoY29uc3QgZGVwIG9mIGRlcGVuZGVuY2llcykge1xuICAgICAgaWYgKFxuICAgICAgICBkZXAgaW5zdGFuY2VvZiBDb21tb25Kc1JlcXVpcmVEZXBlbmRlbmN5IHx8XG4gICAgICAgIGRlcCBpbnN0YW5jZW9mIENvbW1vbkpzRXhwb3J0c0RlcGVuZGVuY3kgfHxcbiAgICAgICAgZGVwIGluc3RhbmNlb2YgQ29tbW9uSnNTZWxmUmVmZXJlbmNlRGVwZW5kZW5jeSB8fFxuICAgICAgICBkZXAgaW5zdGFuY2VvZiBBTUREZWZpbmVEZXBlbmRlbmN5XG4gICAgICApIHtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICB9XG5cbiAgICAgIGlmIChjaGVja1BhcmVudE1vZHVsZXMpIHtcbiAgICAgICAgY29uc3QgbW9kdWxlID0gZ2V0V2VicGFja01vZHVsZShjb21waWxhdGlvbiwgZGVwKTtcbiAgICAgICAgaWYgKG1vZHVsZSAmJiB0aGlzLmhhc0NvbW1vbkpzRGVwZW5kZW5jaWVzKGNvbXBpbGF0aW9uLCBtb2R1bGUuZGVwZW5kZW5jaWVzKSkge1xuICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgcHJpdmF0ZSByYXdSZXF1ZXN0VG9QYWNrYWdlTmFtZShyYXdSZXF1ZXN0OiBzdHJpbmcpOiBzdHJpbmcge1xuICAgIHJldHVybiByYXdSZXF1ZXN0LnN0YXJ0c1dpdGgoJ0AnKVxuICAgICAgPyAvLyBTY29wZWQgcmVxdWVzdCBleDogQGFuZ3VsYXIvY29tbW9uL2xvY2FsZS9lbiAtPiBAYW5ndWxhci9jb21tb25cbiAgICAgICAgcmF3UmVxdWVzdC5zcGxpdCgnLycsIDIpLmpvaW4oJy8nKVxuICAgICAgOiAvLyBOb24tc2NvcGVkIHJlcXVlc3QgZXg6IGxvZGFzaC9pc0VtcHR5IC0+IGxvZGFzaFxuICAgICAgICByYXdSZXF1ZXN0LnNwbGl0KCcvJywgMSlbMF07XG4gIH1cbn1cblxuZnVuY3Rpb24gZ2V0SXNzdWVyKFxuICBjb21waWxhdGlvbjogQ29tcGlsYXRpb24sXG4gIG1vZHVsZTogTW9kdWxlIHwgbnVsbCB8IHVuZGVmaW5lZCxcbik6IE1vZHVsZSB8IG51bGwgfCB1bmRlZmluZWQge1xuICBpZiAoIW1vZHVsZSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIGNvbXBpbGF0aW9uLm1vZHVsZUdyYXBoLmdldElzc3Vlcihtb2R1bGUpO1xufVxuXG5mdW5jdGlvbiBnZXRXZWJwYWNrTW9kdWxlKFxuICBjb21waWxhdGlvbjogQ29tcGlsYXRpb24sXG4gIGRlcGVuZGVuY3k6IERlcGVuZGVuY3kgfCBudWxsLFxuKTogTW9kdWxlIHwgbnVsbCB8IHVuZGVmaW5lZCB7XG4gIGlmICghZGVwZW5kZW5jeSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgcmV0dXJuIGNvbXBpbGF0aW9uLm1vZHVsZUdyYXBoLmdldE1vZHVsZShkZXBlbmRlbmN5KTtcbn1cbiJdfQ==