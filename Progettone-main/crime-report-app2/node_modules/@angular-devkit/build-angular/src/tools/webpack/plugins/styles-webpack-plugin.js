"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StylesWebpackPlugin = void 0;
const assert_1 = __importDefault(require("assert"));
const error_1 = require("../../../utils/error");
const webpack_diagnostics_1 = require("../../../utils/webpack-diagnostics");
/**
 * The name of the plugin provided to Webpack when tapping Webpack compiler hooks.
 */
const PLUGIN_NAME = 'styles-webpack-plugin';
class StylesWebpackPlugin {
    constructor(options) {
        this.options = options;
    }
    apply(compiler) {
        const { entryPoints, preserveSymlinks, root } = this.options;
        const resolver = compiler.resolverFactory.get('global-styles', {
            conditionNames: ['sass', 'less', 'style'],
            mainFields: ['sass', 'less', 'style', 'main', '...'],
            extensions: ['.scss', '.sass', '.less', '.css'],
            restrictions: [/\.((le|sa|sc|c)ss)$/i],
            preferRelative: true,
            useSyncFileSystemCalls: true,
            symlinks: !preserveSymlinks,
            fileSystem: compiler.inputFileSystem ?? undefined,
        });
        const webpackOptions = compiler.options;
        compiler.hooks.environment.tap(PLUGIN_NAME, () => {
            const entry = typeof webpackOptions.entry === 'function' ? webpackOptions.entry() : webpackOptions.entry;
            webpackOptions.entry = async () => {
                var _a;
                const entrypoints = await entry;
                for (const [bundleName, paths] of Object.entries(entryPoints)) {
                    entrypoints[bundleName] ?? (entrypoints[bundleName] = {});
                    const entryImport = ((_a = entrypoints[bundleName]).import ?? (_a.import = []));
                    for (const path of paths) {
                        try {
                            const resolvedPath = resolver.resolveSync({}, root, path);
                            if (resolvedPath) {
                                entryImport.push(`${resolvedPath}?ngGlobalStyle`);
                            }
                            else {
                                (0, assert_1.default)(this.compilation, 'Compilation cannot be undefined.');
                                (0, webpack_diagnostics_1.addError)(this.compilation, `Cannot resolve '${path}'.`);
                            }
                        }
                        catch (error) {
                            (0, assert_1.default)(this.compilation, 'Compilation cannot be undefined.');
                            (0, error_1.assertIsError)(error);
                            (0, webpack_diagnostics_1.addError)(this.compilation, error.message);
                        }
                    }
                }
                return entrypoints;
            };
        });
        compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
            this.compilation = compilation;
        });
    }
}
exports.StylesWebpackPlugin = StylesWebpackPlugin;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3R5bGVzLXdlYnBhY2stcGx1Z2luLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvYW5ndWxhcl9kZXZraXQvYnVpbGRfYW5ndWxhci9zcmMvdG9vbHMvd2VicGFjay9wbHVnaW5zL3N0eWxlcy13ZWJwYWNrLXBsdWdpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7QUFFSCxvREFBNEI7QUFFNUIsZ0RBQXFEO0FBQ3JELDRFQUE4RDtBQVE5RDs7R0FFRztBQUNILE1BQU0sV0FBVyxHQUFHLHVCQUF1QixDQUFDO0FBRTVDLE1BQWEsbUJBQW1CO0lBRzlCLFlBQTZCLE9BQW1DO1FBQW5DLFlBQU8sR0FBUCxPQUFPLENBQTRCO0lBQUcsQ0FBQztJQUVwRSxLQUFLLENBQUMsUUFBa0I7UUFDdEIsTUFBTSxFQUFFLFdBQVcsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDO1FBQzdELE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLGVBQWUsRUFBRTtZQUM3RCxjQUFjLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQztZQUN6QyxVQUFVLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDO1lBQ3BELFVBQVUsRUFBRSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQztZQUMvQyxZQUFZLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQztZQUN0QyxjQUFjLEVBQUUsSUFBSTtZQUNwQixzQkFBc0IsRUFBRSxJQUFJO1lBQzVCLFFBQVEsRUFBRSxDQUFDLGdCQUFnQjtZQUMzQixVQUFVLEVBQUUsUUFBUSxDQUFDLGVBQWUsSUFBSSxTQUFTO1NBQ2xELENBQUMsQ0FBQztRQUVILE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUM7UUFDeEMsUUFBUSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7WUFDL0MsTUFBTSxLQUFLLEdBQ1QsT0FBTyxjQUFjLENBQUMsS0FBSyxLQUFLLFVBQVUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDO1lBRTdGLGNBQWMsQ0FBQyxLQUFLLEdBQUcsS0FBSyxJQUFJLEVBQUU7O2dCQUNoQyxNQUFNLFdBQVcsR0FBRyxNQUFNLEtBQUssQ0FBQztnQkFFaEMsS0FBSyxNQUFNLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLEVBQUU7b0JBQzdELFdBQVcsQ0FBQyxVQUFVLE1BQXRCLFdBQVcsQ0FBQyxVQUFVLElBQU0sRUFBRSxFQUFDO29CQUMvQixNQUFNLFdBQVcsR0FBRyxPQUFDLFdBQVcsQ0FBQyxVQUFVLENBQUMsRUFBQyxNQUFNLFFBQU4sTUFBTSxHQUFLLEVBQUUsRUFBQyxDQUFDO29CQUU1RCxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRTt3QkFDeEIsSUFBSTs0QkFDRixNQUFNLFlBQVksR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7NEJBQzFELElBQUksWUFBWSxFQUFFO2dDQUNoQixXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsWUFBWSxnQkFBZ0IsQ0FBQyxDQUFDOzZCQUNuRDtpQ0FBTTtnQ0FDTCxJQUFBLGdCQUFNLEVBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxrQ0FBa0MsQ0FBQyxDQUFDO2dDQUM3RCxJQUFBLDhCQUFRLEVBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxtQkFBbUIsSUFBSSxJQUFJLENBQUMsQ0FBQzs2QkFDekQ7eUJBQ0Y7d0JBQUMsT0FBTyxLQUFLLEVBQUU7NEJBQ2QsSUFBQSxnQkFBTSxFQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsa0NBQWtDLENBQUMsQ0FBQzs0QkFDN0QsSUFBQSxxQkFBYSxFQUFDLEtBQUssQ0FBQyxDQUFDOzRCQUNyQixJQUFBLDhCQUFRLEVBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7eUJBQzNDO3FCQUNGO2lCQUNGO2dCQUVELE9BQU8sV0FBVyxDQUFDO1lBQ3JCLENBQUMsQ0FBQztRQUNKLENBQUMsQ0FBQyxDQUFDO1FBRUgsUUFBUSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLFdBQVcsRUFBRSxFQUFFO1lBQzlELElBQUksQ0FBQyxXQUFXLEdBQUcsV0FBVyxDQUFDO1FBQ2pDLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBdkRELGtEQXVEQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQGxpY2Vuc2VcbiAqIENvcHlyaWdodCBHb29nbGUgTExDIEFsbCBSaWdodHMgUmVzZXJ2ZWQuXG4gKlxuICogVXNlIG9mIHRoaXMgc291cmNlIGNvZGUgaXMgZ292ZXJuZWQgYnkgYW4gTUlULXN0eWxlIGxpY2Vuc2UgdGhhdCBjYW4gYmVcbiAqIGZvdW5kIGluIHRoZSBMSUNFTlNFIGZpbGUgYXQgaHR0cHM6Ly9hbmd1bGFyLmlvL2xpY2Vuc2VcbiAqL1xuXG5pbXBvcnQgYXNzZXJ0IGZyb20gJ2Fzc2VydCc7XG5pbXBvcnQgdHlwZSB7IENvbXBpbGF0aW9uLCBDb21waWxlciB9IGZyb20gJ3dlYnBhY2snO1xuaW1wb3J0IHsgYXNzZXJ0SXNFcnJvciB9IGZyb20gJy4uLy4uLy4uL3V0aWxzL2Vycm9yJztcbmltcG9ydCB7IGFkZEVycm9yIH0gZnJvbSAnLi4vLi4vLi4vdXRpbHMvd2VicGFjay1kaWFnbm9zdGljcyc7XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3R5bGVzV2VicGFja1BsdWdpbk9wdGlvbnMge1xuICBwcmVzZXJ2ZVN5bWxpbmtzPzogYm9vbGVhbjtcbiAgcm9vdDogc3RyaW5nO1xuICBlbnRyeVBvaW50czogUmVjb3JkPHN0cmluZywgc3RyaW5nW10+O1xufVxuXG4vKipcbiAqIFRoZSBuYW1lIG9mIHRoZSBwbHVnaW4gcHJvdmlkZWQgdG8gV2VicGFjayB3aGVuIHRhcHBpbmcgV2VicGFjayBjb21waWxlciBob29rcy5cbiAqL1xuY29uc3QgUExVR0lOX05BTUUgPSAnc3R5bGVzLXdlYnBhY2stcGx1Z2luJztcblxuZXhwb3J0IGNsYXNzIFN0eWxlc1dlYnBhY2tQbHVnaW4ge1xuICBwcml2YXRlIGNvbXBpbGF0aW9uOiBDb21waWxhdGlvbiB8IHVuZGVmaW5lZDtcblxuICBjb25zdHJ1Y3Rvcihwcml2YXRlIHJlYWRvbmx5IG9wdGlvbnM6IFN0eWxlc1dlYnBhY2tQbHVnaW5PcHRpb25zKSB7fVxuXG4gIGFwcGx5KGNvbXBpbGVyOiBDb21waWxlcik6IHZvaWQge1xuICAgIGNvbnN0IHsgZW50cnlQb2ludHMsIHByZXNlcnZlU3ltbGlua3MsIHJvb3QgfSA9IHRoaXMub3B0aW9ucztcbiAgICBjb25zdCByZXNvbHZlciA9IGNvbXBpbGVyLnJlc29sdmVyRmFjdG9yeS5nZXQoJ2dsb2JhbC1zdHlsZXMnLCB7XG4gICAgICBjb25kaXRpb25OYW1lczogWydzYXNzJywgJ2xlc3MnLCAnc3R5bGUnXSxcbiAgICAgIG1haW5GaWVsZHM6IFsnc2FzcycsICdsZXNzJywgJ3N0eWxlJywgJ21haW4nLCAnLi4uJ10sXG4gICAgICBleHRlbnNpb25zOiBbJy5zY3NzJywgJy5zYXNzJywgJy5sZXNzJywgJy5jc3MnXSxcbiAgICAgIHJlc3RyaWN0aW9uczogWy9cXC4oKGxlfHNhfHNjfGMpc3MpJC9pXSxcbiAgICAgIHByZWZlclJlbGF0aXZlOiB0cnVlLFxuICAgICAgdXNlU3luY0ZpbGVTeXN0ZW1DYWxsczogdHJ1ZSxcbiAgICAgIHN5bWxpbmtzOiAhcHJlc2VydmVTeW1saW5rcyxcbiAgICAgIGZpbGVTeXN0ZW06IGNvbXBpbGVyLmlucHV0RmlsZVN5c3RlbSA/PyB1bmRlZmluZWQsXG4gICAgfSk7XG5cbiAgICBjb25zdCB3ZWJwYWNrT3B0aW9ucyA9IGNvbXBpbGVyLm9wdGlvbnM7XG4gICAgY29tcGlsZXIuaG9va3MuZW52aXJvbm1lbnQudGFwKFBMVUdJTl9OQU1FLCAoKSA9PiB7XG4gICAgICBjb25zdCBlbnRyeSA9XG4gICAgICAgIHR5cGVvZiB3ZWJwYWNrT3B0aW9ucy5lbnRyeSA9PT0gJ2Z1bmN0aW9uJyA/IHdlYnBhY2tPcHRpb25zLmVudHJ5KCkgOiB3ZWJwYWNrT3B0aW9ucy5lbnRyeTtcblxuICAgICAgd2VicGFja09wdGlvbnMuZW50cnkgPSBhc3luYyAoKSA9PiB7XG4gICAgICAgIGNvbnN0IGVudHJ5cG9pbnRzID0gYXdhaXQgZW50cnk7XG5cbiAgICAgICAgZm9yIChjb25zdCBbYnVuZGxlTmFtZSwgcGF0aHNdIG9mIE9iamVjdC5lbnRyaWVzKGVudHJ5UG9pbnRzKSkge1xuICAgICAgICAgIGVudHJ5cG9pbnRzW2J1bmRsZU5hbWVdID8/PSB7fTtcbiAgICAgICAgICBjb25zdCBlbnRyeUltcG9ydCA9IChlbnRyeXBvaW50c1tidW5kbGVOYW1lXS5pbXBvcnQgPz89IFtdKTtcblxuICAgICAgICAgIGZvciAoY29uc3QgcGF0aCBvZiBwYXRocykge1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgY29uc3QgcmVzb2x2ZWRQYXRoID0gcmVzb2x2ZXIucmVzb2x2ZVN5bmMoe30sIHJvb3QsIHBhdGgpO1xuICAgICAgICAgICAgICBpZiAocmVzb2x2ZWRQYXRoKSB7XG4gICAgICAgICAgICAgICAgZW50cnlJbXBvcnQucHVzaChgJHtyZXNvbHZlZFBhdGh9P25nR2xvYmFsU3R5bGVgKTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBhc3NlcnQodGhpcy5jb21waWxhdGlvbiwgJ0NvbXBpbGF0aW9uIGNhbm5vdCBiZSB1bmRlZmluZWQuJyk7XG4gICAgICAgICAgICAgICAgYWRkRXJyb3IodGhpcy5jb21waWxhdGlvbiwgYENhbm5vdCByZXNvbHZlICcke3BhdGh9Jy5gKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgYXNzZXJ0KHRoaXMuY29tcGlsYXRpb24sICdDb21waWxhdGlvbiBjYW5ub3QgYmUgdW5kZWZpbmVkLicpO1xuICAgICAgICAgICAgICBhc3NlcnRJc0Vycm9yKGVycm9yKTtcbiAgICAgICAgICAgICAgYWRkRXJyb3IodGhpcy5jb21waWxhdGlvbiwgZXJyb3IubWVzc2FnZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGVudHJ5cG9pbnRzO1xuICAgICAgfTtcbiAgICB9KTtcblxuICAgIGNvbXBpbGVyLmhvb2tzLnRoaXNDb21waWxhdGlvbi50YXAoUExVR0lOX05BTUUsIChjb21waWxhdGlvbikgPT4ge1xuICAgICAgdGhpcy5jb21waWxhdGlvbiA9IGNvbXBpbGF0aW9uO1xuICAgIH0pO1xuICB9XG59XG4iXX0=