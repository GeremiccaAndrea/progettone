"use strict";
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute = void 0;
const architect_1 = require("@angular-devkit/architect");
const core_1 = require("@angular-devkit/core");
const module_1 = require("module");
const path = __importStar(require("path"));
const rxjs_1 = require("rxjs");
const configs_1 = require("../../tools/webpack/configs");
const purge_cache_1 = require("../../utils/purge-cache");
const version_1 = require("../../utils/version");
const webpack_browser_config_1 = require("../../utils/webpack-browser-config");
const schema_1 = require("../browser/schema");
const find_tests_plugin_1 = require("./find-tests-plugin");
async function initialize(options, context, webpackConfigurationTransformer) {
    // Purge old build disk cache.
    await (0, purge_cache_1.purgeStaleBuildCache)(context);
    const { config } = await (0, webpack_browser_config_1.generateBrowserWebpackConfigFromContext)(
    // only two properties are missing:
    // * `outputPath` which is fixed for tests
    // * `budgets` which might be incorrect due to extra dev libs
    {
        ...options,
        outputPath: '',
        budgets: undefined,
        optimization: false,
        buildOptimizer: false,
        aot: false,
        vendorChunk: true,
        namedChunks: true,
        extractLicenses: false,
        outputHashing: schema_1.OutputHashing.None,
        // The webpack tier owns the watch behavior so we want to force it in the config.
        // When not in watch mode, webpack-dev-middleware will call `compiler.watch` anyway.
        // https://github.com/webpack/webpack-dev-middleware/blob/698c9ae5e9bb9a013985add6189ff21c1a1ec185/src/index.js#L65
        // https://github.com/webpack/webpack/blob/cde1b73e12eb8a77eb9ba42e7920c9ec5d29c2c9/lib/Compiler.js#L379-L388
        watch: true,
    }, context, (wco) => [(0, configs_1.getCommonConfig)(wco), (0, configs_1.getStylesConfig)(wco)]);
    const karma = await Promise.resolve().then(() => __importStar(require('karma')));
    return [karma, (await webpackConfigurationTransformer?.(config)) ?? config];
}
/**
 * @experimental Direct usage of this function is considered experimental.
 */
function execute(options, context, transforms = {}) {
    // Check Angular version.
    (0, version_1.assertCompatibleAngularVersion)(context.workspaceRoot);
    let singleRun;
    if (options.watch !== undefined) {
        singleRun = !options.watch;
    }
    return (0, rxjs_1.from)(initialize(options, context, transforms.webpackConfiguration)).pipe((0, rxjs_1.switchMap)(async ([karma, webpackConfig]) => {
        var _a;
        // Determine project name from builder context target
        const projectName = context.target?.project;
        if (!projectName) {
            throw new Error(`The 'karma' builder requires a target to be specified.`);
        }
        const karmaOptions = options.karmaConfig
            ? {}
            : getBuiltInKarmaConfig(context.workspaceRoot, projectName);
        karmaOptions.singleRun = singleRun;
        // Workaround https://github.com/angular/angular-cli/issues/28271, by clearing context by default
        // for single run executions. Not clearing context for multi-run (watched) builds allows the
        // Jasmine Spec Runner to be visible in the browser after test execution.
        karmaOptions.client ?? (karmaOptions.client = {});
        (_a = karmaOptions.client).clearContext ?? (_a.clearContext = singleRun ?? false); // `singleRun` defaults to `false` per Karma docs.
        // Convert browsers from a string to an array
        if (options.browsers) {
            karmaOptions.browsers = options.browsers.split(',');
        }
        if (options.reporters) {
            // Split along commas to make it more natural, and remove empty strings.
            const reporters = options.reporters
                .reduce((acc, curr) => acc.concat(curr.split(',')), [])
                .filter((x) => !!x);
            if (reporters.length > 0) {
                karmaOptions.reporters = reporters;
            }
        }
        if (!options.main) {
            webpackConfig.entry ?? (webpackConfig.entry = {});
            if (typeof webpackConfig.entry === 'object' && !Array.isArray(webpackConfig.entry)) {
                if (Array.isArray(webpackConfig.entry['main'])) {
                    webpackConfig.entry['main'].push(getBuiltInMainFile());
                }
                else {
                    webpackConfig.entry['main'] = [getBuiltInMainFile()];
                }
            }
        }
        const projectMetadata = await context.getProjectMetadata(projectName);
        const sourceRoot = (projectMetadata.sourceRoot ?? projectMetadata.root ?? '');
        webpackConfig.plugins ?? (webpackConfig.plugins = []);
        webpackConfig.plugins.push(new find_tests_plugin_1.FindTestsPlugin({
            include: options.include,
            exclude: options.exclude,
            workspaceRoot: context.workspaceRoot,
            projectSourceRoot: path.join(context.workspaceRoot, sourceRoot),
        }));
        karmaOptions.buildWebpack = {
            options,
            webpackConfig,
            logger: context.logger,
        };
        const parsedKarmaConfig = await karma.config.parseConfig(options.karmaConfig && path.resolve(context.workspaceRoot, options.karmaConfig), transforms.karmaOptions ? transforms.karmaOptions(karmaOptions) : karmaOptions, { promiseConfig: true, throwErrors: true });
        return [karma, parsedKarmaConfig];
    }), (0, rxjs_1.switchMap)(([karma, karmaConfig]) => new rxjs_1.Observable((subscriber) => {
        var _a, _b;
        // Pass onto Karma to emit BuildEvents.
        karmaConfig.buildWebpack ?? (karmaConfig.buildWebpack = {});
        if (typeof karmaConfig.buildWebpack === 'object') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (_a = karmaConfig.buildWebpack).failureCb ?? (_a.failureCb = () => subscriber.next({ success: false }));
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (_b = karmaConfig.buildWebpack).successCb ?? (_b.successCb = () => subscriber.next({ success: true }));
        }
        // Complete the observable once the Karma server returns.
        const karmaServer = new karma.Server(karmaConfig, (exitCode) => {
            subscriber.next({ success: exitCode === 0 });
            subscriber.complete();
        });
        const karmaStart = karmaServer.start();
        // Cleanup, signal Karma to exit.
        return () => {
            void karmaStart.then(() => karmaServer.stop());
        };
    })), (0, rxjs_1.defaultIfEmpty)({ success: false }));
}
exports.execute = execute;
function getBuiltInKarmaConfig(workspaceRoot, projectName) {
    let coverageFolderName = projectName.charAt(0) === '@' ? projectName.slice(1) : projectName;
    if (/[A-Z]/.test(coverageFolderName)) {
        coverageFolderName = core_1.strings.dasherize(coverageFolderName);
    }
    const workspaceRootRequire = (0, module_1.createRequire)(workspaceRoot + '/');
    // Any changes to the config here need to be synced to: packages/schematics/angular/config/files/karma.conf.js.template
    return {
        basePath: '',
        frameworks: ['jasmine', '@angular-devkit/build-angular'],
        plugins: [
            'karma-jasmine',
            'karma-chrome-launcher',
            'karma-jasmine-html-reporter',
            'karma-coverage',
            '@angular-devkit/build-angular/plugins/karma',
        ].map((p) => workspaceRootRequire(p)),
        jasmineHtmlReporter: {
            suppressAll: true, // removes the duplicated traces
        },
        coverageReporter: {
            dir: path.join(workspaceRoot, 'coverage', coverageFolderName),
            subdir: '.',
            reporters: [{ type: 'html' }, { type: 'text-summary' }],
        },
        reporters: ['progress', 'kjhtml'],
        browsers: ['Chrome'],
        customLaunchers: {
            // Chrome configured to run in a bazel sandbox.
            // Disable the use of the gpu and `/dev/shm` because it causes Chrome to
            // crash on some environments.
            // See:
            //   https://github.com/puppeteer/puppeteer/blob/v1.0.0/docs/troubleshooting.md#tips
            //   https://stackoverflow.com/questions/50642308/webdriverexception-unknown-error-devtoolsactiveport-file-doesnt-exist-while-t
            ChromeHeadlessNoSandbox: {
                base: 'ChromeHeadless',
                flags: ['--no-sandbox', '--headless', '--disable-gpu', '--disable-dev-shm-usage'],
            },
        },
        restartOnFileChange: true,
    };
}
exports.default = (0, architect_1.createBuilder)(execute);
function getBuiltInMainFile() {
    const content = Buffer.from(`
  import { getTestBed } from '@angular/core/testing';
  import {
    BrowserDynamicTestingModule,
    platformBrowserDynamicTesting,
   } from '@angular/platform-browser-dynamic/testing';

  // Initialize the Angular testing environment.
  getTestBed().initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting(), {
    errorOnUnknownElements: true,
    errorOnUnknownProperties: true
  });
`).toString('base64');
    return `ng-virtual-main.js!=!data:text/javascript;base64,${content}`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi8uLi9wYWNrYWdlcy9hbmd1bGFyX2RldmtpdC9idWlsZF9hbmd1bGFyL3NyYy9idWlsZGVycy9rYXJtYS9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVILHlEQUF5RjtBQUN6RiwrQ0FBK0M7QUFFL0MsbUNBQXVDO0FBQ3ZDLDJDQUE2QjtBQUM3QiwrQkFBbUU7QUFFbkUseURBQStFO0FBRS9FLHlEQUErRDtBQUMvRCxpREFBcUU7QUFDckUsK0VBQTZGO0FBQzdGLDhDQUFtRjtBQUNuRiwyREFBc0Q7QUFRdEQsS0FBSyxVQUFVLFVBQVUsQ0FDdkIsT0FBNEIsRUFDNUIsT0FBdUIsRUFDdkIsK0JBQXFFO0lBRXJFLDhCQUE4QjtJQUM5QixNQUFNLElBQUEsa0NBQW9CLEVBQUMsT0FBTyxDQUFDLENBQUM7SUFFcEMsTUFBTSxFQUFFLE1BQU0sRUFBRSxHQUFHLE1BQU0sSUFBQSxnRUFBdUM7SUFDOUQsbUNBQW1DO0lBQ25DLDBDQUEwQztJQUMxQyw2REFBNkQ7SUFDN0Q7UUFDRSxHQUFJLE9BQTRDO1FBQ2hELFVBQVUsRUFBRSxFQUFFO1FBQ2QsT0FBTyxFQUFFLFNBQVM7UUFDbEIsWUFBWSxFQUFFLEtBQUs7UUFDbkIsY0FBYyxFQUFFLEtBQUs7UUFDckIsR0FBRyxFQUFFLEtBQUs7UUFDVixXQUFXLEVBQUUsSUFBSTtRQUNqQixXQUFXLEVBQUUsSUFBSTtRQUNqQixlQUFlLEVBQUUsS0FBSztRQUN0QixhQUFhLEVBQUUsc0JBQWEsQ0FBQyxJQUFJO1FBQ2pDLGlGQUFpRjtRQUNqRixvRkFBb0Y7UUFDcEYsbUhBQW1IO1FBQ25ILDZHQUE2RztRQUM3RyxLQUFLLEVBQUUsSUFBSTtLQUNaLEVBQ0QsT0FBTyxFQUNQLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxD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LEVBQUU7WUFDaEIsR0FBRyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLFVBQVUsRUFBRSxrQkFBa0IsQ0FBQztZQUM3RCxNQUFNLEVBQUUsR0FBRztZQUNYLFNBQVMsRUFBRSxDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLGNBQWMsRUFBRSxDQUFDO1NBQ3hEO1FBQ0QsU0FBUyxFQUFFLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQztRQUNqQyxRQUFRLEVBQUUsQ0FBQyxRQUFRLENBQUM7UUFDcEIsZUFBZSxFQUFFO1lBQ2YsK0NBQStDO1lBQy9DLHdFQUF3RTtZQUN4RSw4QkFBOEI7WUFDOUIsT0FBTztZQUNQLG9GQUFvRjtZQUNwRiwrSEFBK0g7WUFDL0gsdUJBQXVCLEVBQUU7Z0JBQ3ZCLElBQUksRUFBRSxnQkFBZ0I7Z0JBQ3RCLEtBQUssRUFBRSxDQUFDLGNBQWMsRUFBRSxZQUFZLEVBQUUsZUFBZSxFQUFFLHlCQUF5QixDQUFDO2FBQ2xGO1NBQ0Y7UUFDRCxtQkFBbUIsRUFBRSxJQUFJO0tBQzFCLENBQUM7QUFDSixDQUFDO0FBR0Qsa0JBQWUsSUFBQSx5QkFBYSxFQUErQyxPQUFPLENBQUMsQ0FBQztBQUVwRixTQUFTLGtCQUFrQjtJQUN6QixNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUN6Qjs7Ozs7Ozs7Ozs7O0NBWUgsQ0FDRSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUVyQixPQUFPLG9EQUFvRCxPQUFPLEVBQUUsQ0FBQztBQUN2RSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBAbGljZW5zZVxuICogQ29weXJpZ2h0IEdvb2dsZSBMTEMgQWxsIFJpZ2h0cyBSZXNlcnZlZC5cbiAqXG4gKiBVc2Ugb2YgdGhpcyBzb3VyY2UgY29kZSBpcyBnb3Zlcm5lZCBieSBhbiBNSVQtc3R5bGUgbGljZW5zZSB0aGF0IGNhbiBiZVxuICogZm91bmQgaW4gdGhlIExJQ0VOU0UgZmlsZSBhdCBodHRwczovL2FuZ3VsYXIuaW8vbGljZW5zZVxuICovXG5cbmltcG9ydCB7IEJ1aWxkZXJDb250ZXh0LCBCdWlsZGVyT3V0cHV0LCBjcmVhdGVCdWlsZGVyIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2FyY2hpdGVjdCc7XG5pbXBvcnQgeyBzdHJpbmdzIH0gZnJvbSAnQGFuZ3VsYXItZGV2a2l0L2NvcmUnO1xuaW1wb3J0IHR5cGUgeyBDb25maWcsIENvbmZpZ09wdGlvbnMgfSBmcm9tICdrYXJtYSc7XG5pbXBvcnQgeyBjcmVhdGVSZXF1aXJlIH0gZnJvbSAnbW9kdWxlJztcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBPYnNlcnZhYmxlLCBkZWZhdWx0SWZFbXB0eSwgZnJvbSwgc3dpdGNoTWFwIH0gZnJvbSAncnhqcyc7XG5pbXBvcnQgeyBDb25maWd1cmF0aW9uIH0gZnJvbSAnd2VicGFjayc7XG5pbXBvcnQgeyBnZXRDb21tb25Db25maWcsIGdldFN0eWxlc0NvbmZpZyB9IGZyb20gJy4uLy4uL3Rvb2xzL3dlYnBhY2svY29uZmlncyc7XG5pbXBvcnQgeyBFeGVjdXRpb25UcmFuc2Zvcm1lciB9IGZyb20gJy4uLy4uL3RyYW5zZm9ybXMnO1xuaW1wb3J0IHsgcHVyZ2VTdGFsZUJ1aWxkQ2FjaGUgfSBmcm9tICcuLi8uLi91dGlscy9wdXJnZS1jYWNoZSc7XG5pbXBvcnQgeyBhc3NlcnRDb21wYXRpYmxlQW5ndWxhclZlcnNpb24gfSBmcm9tICcuLi8uLi91dGlscy92ZXJzaW9uJztcbmltcG9ydCB7IGdlbmVyYXRlQnJvd3NlcldlYnBhY2tDb25maWdGcm9tQ29udGV4dCB9IGZyb20gJy4uLy4uL3V0aWxzL3dlYnBhY2stYnJvd3Nlci1jb25maWcnO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEJyb3dzZXJCdWlsZGVyT3B0aW9ucywgT3V0cHV0SGFzaGluZyB9IGZyb20gJy4uL2Jyb3dzZXIvc2NoZW1hJztcbmltcG9ydCB7IEZpbmRUZXN0c1BsdWdpbiB9IGZyb20gJy4vZmluZC10ZXN0cy1wbHVnaW4nO1xuaW1wb3J0IHsgU2NoZW1hIGFzIEthcm1hQnVpbGRlck9wdGlvbnMgfSBmcm9tICcuL3NjaGVtYSc7XG5cbmV4cG9ydCB0eXBlIEthcm1hQ29uZmlnT3B0aW9ucyA9IENvbmZpZ09wdGlvbnMgJiB7XG4gIGJ1aWxkV2VicGFjaz86IHVua25vd247XG4gIGNvbmZpZ0ZpbGU/OiBzdHJpbmc7XG59O1xuXG5hc3luYyBmdW5jdGlvbiBpbml0aWFsaXplKFxuICBvcHRpb25zOiBLYXJtYUJ1aWxkZXJPcHRpb25zLFxuICBjb250ZXh0OiBCdWlsZGVyQ29udGV4dCxcbiAgd2VicGFja0NvbmZpZ3VyYXRpb25UcmFuc2Zvcm1lcj86IEV4ZWN1dGlvblRyYW5zZm9ybWVyPENvbmZpZ3VyYXRpb24+LFxuKTogUHJvbWlzZTxbdHlwZW9mIGltcG9ydCgna2FybWEnKSwgQ29uZmlndXJhdGlvbl0+IHtcbiAgLy8gUHVyZ2Ugb2xkIGJ1aWxkIGRpc2sgY2FjaGUuXG4gIGF3YWl0IHB1cmdlU3RhbGVCdWlsZENhY2hlKGNvbnRleHQpO1xuXG4gIGNvbnN0IHsgY29uZmlnIH0gPSBhd2FpdCBnZW5lcmF0ZUJyb3dzZXJXZWJwYWNrQ29uZmlnRnJvbUNvbnRleHQoXG4gICAgLy8gb25seSB0d28gcHJvcGVydGllcyBhcmUgbWlzc2luZzpcbiAgICAvLyAqIGBvdXRwdXRQYXRoYCB3aGljaCBpcyBmaXhlZCBmb3IgdGVzdHNcbiAgICAvLyAqIGBidWRnZXRzYCB3aGljaCBtaWdodCBiZSBpbmNvcnJlY3QgZHVlIHRvIGV4dHJhIGRldiBsaWJzXG4gICAge1xuICAgICAgLi4uKG9wdGlvbnMgYXMgdW5rbm93biBhcyBCcm93c2VyQnVpbGRlck9wdGlvbnMpLFxuICAgICAgb3V0cHV0UGF0aDogJycsXG4gICAgICBidWRnZXRzOiB1bmRlZmluZWQsXG4gICAgICBvcHRpbWl6YXRpb246IGZhbHNlLFxuICAgICAgYnVpbGRPcHRpbWl6ZXI6IGZhbHNlLFxuICAgICAgYW90OiBmYWxzZSxcbiAgICAgIHZlbmRvckNodW5rOiB0cnVlLFxuICAgICAgbmFtZWRDaHVua3M6IHRydWUsXG4gICAgICBleHRyYWN0TGljZW5zZXM6IGZhbHNlLFxuICAgICAgb3V0cHV0SGFzaGluZzogT3V0cHV0SGFzaGluZy5Ob25lLFxuICAgICAgLy8gVGhlIHdlYnBhY2sgdGllciBvd25zIHRoZSB3YXRjaCBiZWhhdmlvciBzbyB3ZSB3YW50IHRvIGZvcmNlIGl0IGluIHRoZSBjb25maWcuXG4gICAgICAvLyBXaGVuIG5vdCBpbiB3YXRjaCBtb2RlLCB3ZWJwYWNrLWRldi1taWRkbGV3YXJlIHdpbGwgY2FsbCBgY29tcGlsZXIud2F0Y2hgIGFueXdheS5cbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS93ZWJwYWNrL3dlYnBhY2stZGV2LW1pZGRsZXdhcmUvYmxvYi82OThjOWFlNWU5YmI5YTAxMzk4NWFkZDYxODlmZjIxYzFhMWVjMTg1L3NyYy9pbmRleC5qcyNMNjVcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS93ZWJwYWNrL3dlYnBhY2svYmxvYi9jZGUxYjczZTEyZWI4YTc3ZWI5YmE0MmU3OTIwYzllYzVkMjljMmM5L2xpYi9Db21waWxlci5qcyNMMzc5LUwzODhcbiAgICAgIHdhdGNoOiB0cnVlLFxuICAgIH0sXG4gICAgY29udGV4dCxcbiAgICAod2NvKSA9PiBbZ2V0Q29tbW9uQ29uZmlnKHdjbyksIGdldFN0eWxlc0NvbmZpZyh3Y28pXSxcbiAgKTtcblxuICBjb25zdCBrYXJtYSA9IGF3YWl0IGltcG9ydCgna2FybWEnKTtcblxuICByZXR1cm4gW2thcm1hLCAoYXdhaXQgd2VicGFja0NvbmZpZ3VyYXRpb25UcmFuc2Zvcm1lcj8uKGNvbmZpZykpID8/IGNvbmZpZ107XG59XG5cbi8qKlxuICogQGV4cGVyaW1lbnRhbCBEaXJlY3QgdXNhZ2Ugb2YgdGhpcyBmdW5jdGlvbiBpcyBjb25zaWRlcmVkIGV4cGVyaW1lbnRhbC5cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV4ZWN1dGUoXG4gIG9wdGlvbnM6IEthcm1hQnVpbGRlck9wdGlvbnMsXG4gIGNvbnRleHQ6IEJ1aWxkZXJDb250ZXh0LFxuICB0cmFuc2Zvcm1zOiB7XG4gICAgd2VicGFja0NvbmZpZ3VyYXRpb24/OiBFeGVjdXRpb25UcmFuc2Zvcm1lcjxDb25maWd1cmF0aW9uPjtcbiAgICAvLyBUaGUga2FybWEgb3B0aW9ucyB0cmFuc2Zvcm0gY2Fubm90IGJlIGFzeW5jIHdpdGhvdXQgYSByZWZhY3RvciBvZiB0aGUgYnVpbGRlciBpbXBsZW1lbnRhdGlvblxuICAgIGthcm1hT3B0aW9ucz86IChvcHRpb25zOiBLYXJtYUNvbmZpZ09wdGlvbnMpID0+IEthcm1hQ29uZmlnT3B0aW9ucztcbiAgfSA9IHt9LFxuKTogT2JzZXJ2YWJsZTxCdWlsZGVyT3V0cHV0PiB7XG4gIC8vIENoZWNrIEFuZ3VsYXIgdmVyc2lvbi5cbiAgYXNzZXJ0Q29tcGF0aWJsZUFuZ3VsYXJWZXJzaW9uKGNvbnRleHQud29ya3NwYWNlUm9vdCk7XG5cbiAgbGV0IHNpbmdsZVJ1bjogYm9vbGVhbiB8IHVuZGVmaW5lZDtcbiAgaWYgKG9wdGlvbnMud2F0Y2ggIT09IHVuZGVmaW5lZCkge1xuICAgIHNpbmdsZVJ1biA9ICFvcHRpb25zLndhdGNoO1xuICB9XG5cbiAgcmV0dXJuIGZyb20oaW5pdGlhbGl6ZShvcHRpb25zLCBjb250ZXh0LCB0cmFuc2Zvcm1zLndlYnBhY2tDb25maWd1cmF0aW9uKSkucGlwZShcbiAgICBzd2l0Y2hNYXAoYXN5bmMgKFtrYXJtYSwgd2VicGFja0NvbmZpZ10pID0+IHtcbiAgICAgIC8vIERldGVybWluZSBwcm9qZWN0IG5hbWUgZnJvbSBidWlsZGVyIGNvbnRleHQgdGFyZ2V0XG4gICAgICBjb25zdCBwcm9qZWN0TmFtZSA9IGNvbnRleHQudGFyZ2V0Py5wcm9qZWN0O1xuICAgICAgaWYgKCFwcm9qZWN0TmFtZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFRoZSAna2FybWEnIGJ1aWxkZXIgcmVxdWlyZXMgYSB0YXJnZXQgdG8gYmUgc3BlY2lmaWVkLmApO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBrYXJtYU9wdGlvbnM6IEthcm1hQ29uZmlnT3B0aW9ucyA9IG9wdGlvbnMua2FybWFDb25maWdcbiAgICAgICAgPyB7fVxuICAgICAgICA6IGdldEJ1aWx0SW5LYXJtYUNvbmZpZyhjb250ZXh0LndvcmtzcGFjZVJvb3QsIHByb2plY3ROYW1lKTtcblxuICAgICAga2FybWFPcHRpb25zLnNpbmdsZVJ1biA9IHNpbmdsZVJ1bjtcblxuICAgICAgLy8gV29ya2Fyb3VuZCBodHRwczovL2dpdGh1Yi5jb20vYW5ndWxhci9hbmd1bGFyLWNsaS9pc3N1ZXMvMjgyNzEsIGJ5IGNsZWFyaW5nIGNvbnRleHQgYnkgZGVmYXVsdFxuICAgICAgLy8gZm9yIHNpbmdsZSBydW4gZXhlY3V0aW9ucy4gTm90IGNsZWFyaW5nIGNvbnRleHQgZm9yIG11bHRpLXJ1biAod2F0Y2hlZCkgYnVpbGRzIGFsbG93cyB0aGVcbiAgICAgIC8vIEphc21pbmUgU3BlYyBSdW5uZXIgdG8gYmUgdmlzaWJsZSBpbiB0aGUgYnJvd3NlciBhZnRlciB0ZXN0IGV4ZWN1dGlvbi5cbiAgICAgIGthcm1hT3B0aW9ucy5jbGllbnQgPz89IHt9O1xuICAgICAga2FybWFPcHRpb25zLmNsaWVudC5jbGVhckNvbnRleHQgPz89IHNpbmdsZVJ1biA/PyBmYWxzZTsgLy8gYHNpbmdsZVJ1bmAgZGVmYXVsdHMgdG8gYGZhbHNlYCBwZXIgS2FybWEgZG9jcy5cblxuICAgICAgLy8gQ29udmVydCBicm93c2VycyBmcm9tIGEgc3RyaW5nIHRvIGFuIGFycmF5XG4gICAgICBpZiAob3B0aW9ucy5icm93c2Vycykge1xuICAgICAgICBrYXJtYU9wdGlvbnMuYnJvd3NlcnMgPSBvcHRpb25zLmJyb3dzZXJzLnNwbGl0KCcsJyk7XG4gICAgICB9XG5cbiAgICAgIGlmIChvcHRpb25zLnJlcG9ydGVycykge1xuICAgICAgICAvLyBTcGxpdCBhbG9uZyBjb21tYXMgdG8gbWFrZSBpdCBtb3JlIG5hdHVyYWwsIGFuZCByZW1vdmUgZW1wdHkgc3RyaW5ncy5cbiAgICAgICAgY29uc3QgcmVwb3J0ZXJzID0gb3B0aW9ucy5yZXBvcnRlcnNcbiAgICAgICAgICAucmVkdWNlPHN0cmluZ1tdPigoYWNjLCBjdXJyKSA9PiBhY2MuY29uY2F0KGN1cnIuc3BsaXQoJywnKSksIFtdKVxuICAgICAgICAgIC5maWx0ZXIoKHgpID0+ICEheCk7XG5cbiAgICAgICAgaWYgKHJlcG9ydGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAga2FybWFPcHRpb25zLnJlcG9ydGVycyA9IHJlcG9ydGVycztcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBpZiAoIW9wdGlvbnMubWFpbikge1xuICAgICAgICB3ZWJwYWNrQ29uZmlnLmVudHJ5ID8/PSB7fTtcbiAgICAgICAgaWYgKHR5cGVvZiB3ZWJwYWNrQ29uZmlnLmVudHJ5ID09PSAnb2JqZWN0JyAmJiAhQXJyYXkuaXNBcnJheSh3ZWJwYWNrQ29uZmlnLmVudHJ5KSkge1xuICAgICAgICAgIGlmIChBcnJheS5pc0FycmF5KHdlYnBhY2tDb25maWcuZW50cnlbJ21haW4nXSkpIHtcbiAgICAgICAgICAgIHdlYnBhY2tDb25maWcuZW50cnlbJ21haW4nXS5wdXNoKGdldEJ1aWx0SW5NYWluRmlsZSgpKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2VicGFja0NvbmZpZy5lbnRyeVsnbWFpbiddID0gW2dldEJ1aWx0SW5NYWluRmlsZSgpXTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgY29uc3QgcHJvamVjdE1ldGFkYXRhID0gYXdhaXQgY29udGV4dC5nZXRQcm9qZWN0TWV0YWRhdGEocHJvamVjdE5hbWUpO1xuICAgICAgY29uc3Qgc291cmNlUm9vdCA9IChwcm9qZWN0TWV0YWRhdGEuc291cmNlUm9vdCA/PyBwcm9qZWN0TWV0YWRhdGEucm9vdCA/PyAnJykgYXMgc3RyaW5nO1xuXG4gICAgICB3ZWJwYWNrQ29uZmlnLnBsdWdpbnMgPz89IFtdO1xuICAgICAgd2VicGFja0NvbmZpZy5wbHVnaW5zLnB1c2goXG4gICAgICAgIG5ldyBGaW5kVGVzdHNQbHVnaW4oe1xuICAgICAgICAgIGluY2x1ZGU6IG9wdGlvbnMuaW5jbHVkZSxcbiAgICAgICAgICBleGNsdWRlOiBvcHRpb25zLmV4Y2x1ZGUsXG4gICAgICAgICAgd29ya3NwYWNlUm9vdDogY29udGV4dC53b3Jrc3BhY2VSb290LFxuICAgICAgICAgIHByb2plY3RTb3VyY2VSb290OiBwYXRoLmpvaW4oY29udGV4dC53b3Jrc3BhY2VSb290LCBzb3VyY2VSb290KSxcbiAgICAgICAgfSksXG4gICAgICApO1xuXG4gICAgICBrYXJtYU9wdGlvbnMuYnVpbGRXZWJwYWNrID0ge1xuICAgICAgICBvcHRpb25zLFxuICAgICAgICB3ZWJwYWNrQ29uZmlnLFxuICAgICAgICBsb2dnZXI6IGNvbnRleHQubG9nZ2VyLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgcGFyc2VkS2FybWFDb25maWcgPSBhd2FpdCBrYXJtYS5jb25maWcucGFyc2VDb25maWcoXG4gICAgICAgIG9wdGlvbnMua2FybWFDb25maWcgJiYgcGF0aC5yZXNvbHZlKGNvbnRleHQud29ya3NwYWNlUm9vdCwgb3B0aW9ucy5rYXJtYUNvbmZpZyksXG4gICAgICAgIHRyYW5zZm9ybXMua2FybWFPcHRpb25zID8gdHJhbnNmb3Jtcy5rYXJtYU9wdGlvbnMoa2FybWFPcHRpb25zKSA6IGthcm1hT3B0aW9ucyxcbiAgICAgICAgeyBwcm9taXNlQ29uZmlnOiB0cnVlLCB0aHJvd0Vycm9yczogdHJ1ZSB9LFxuICAgICAgKTtcblxuICAgICAgcmV0dXJuIFtrYXJtYSwgcGFyc2VkS2FybWFDb25maWddIGFzIFt0eXBlb2Yga2FybWEsIEthcm1hQ29uZmlnT3B0aW9uc107XG4gICAgfSksXG4gICAgc3dpdGNoTWFwKFxuICAgICAgKFtrYXJtYSwga2FybWFDb25maWddKSA9PlxuICAgICAgICBuZXcgT2JzZXJ2YWJsZTxCdWlsZGVyT3V0cHV0Pigoc3Vic2NyaWJlcikgPT4ge1xuICAgICAgICAgIC8vIFBhc3Mgb250byBLYXJtYSB0byBlbWl0IEJ1aWxkRXZlbnRzLlxuICAgICAgICAgIGthcm1hQ29uZmlnLmJ1aWxkV2VicGFjayA/Pz0ge307XG4gICAgICAgICAgaWYgKHR5cGVvZiBrYXJtYUNvbmZpZy5idWlsZFdlYnBhY2sgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgICAgICAgKGthcm1hQ29uZmlnLmJ1aWxkV2VicGFjayBhcyBhbnkpLmZhaWx1cmVDYiA/Pz0gKCkgPT5cbiAgICAgICAgICAgICAgc3Vic2NyaWJlci5uZXh0KHsgc3VjY2VzczogZmFsc2UgfSk7XG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxuICAgICAgICAgICAgKGthcm1hQ29uZmlnLmJ1aWxkV2VicGFjayBhcyBhbnkpLnN1Y2Nlc3NDYiA/Pz0gKCkgPT5cbiAgICAgICAgICAgICAgc3Vic2NyaWJlci5uZXh0KHsgc3VjY2VzczogdHJ1ZSB9KTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBDb21wbGV0ZSB0aGUgb2JzZXJ2YWJsZSBvbmNlIHRoZSBLYXJtYSBzZXJ2ZXIgcmV0dXJucy5cbiAgICAgICAgICBjb25zdCBrYXJtYVNlcnZlciA9IG5ldyBrYXJtYS5TZXJ2ZXIoa2FybWFDb25maWcgYXMgQ29uZmlnLCAoZXhpdENvZGUpID0+IHtcbiAgICAgICAgICAgIHN1YnNjcmliZXIubmV4dCh7IHN1Y2Nlc3M6IGV4aXRDb2RlID09PSAwIH0pO1xuICAgICAgICAgICAgc3Vic2NyaWJlci5jb21wbGV0ZSgpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgY29uc3Qga2FybWFTdGFydCA9IGthcm1hU2VydmVyLnN0YXJ0KCk7XG5cbiAgICAgICAgICAvLyBDbGVhbnVwLCBzaWduYWwgS2FybWEgdG8gZXhpdC5cbiAgICAgICAgICByZXR1cm4gKCkgPT4ge1xuICAgICAgICAgICAgdm9pZCBrYXJtYVN0YXJ0LnRoZW4oKCkgPT4ga2FybWFTZXJ2ZXIuc3RvcCgpKTtcbiAgICAgICAgICB9O1xuICAgICAgICB9KSxcbiAgICApLFxuICAgIGRlZmF1bHRJZkVtcHR5KHsgc3VjY2VzczogZmFsc2UgfSksXG4gICk7XG59XG5cbmZ1bmN0aW9uIGdldEJ1aWx0SW5LYXJtYUNvbmZpZyhcbiAgd29ya3NwYWNlUm9vdDogc3RyaW5nLFxuICBwcm9qZWN0TmFtZTogc3RyaW5nLFxuKTogQ29uZmlnT3B0aW9ucyAmIFJlY29yZDxzdHJpbmcsIHVua25vd24+IHtcbiAgbGV0IGNvdmVyYWdlRm9sZGVyTmFtZSA9IHByb2plY3ROYW1lLmNoYXJBdCgwKSA9PT0gJ0AnID8gcHJvamVjdE5hbWUuc2xpY2UoMSkgOiBwcm9qZWN0TmFtZTtcbiAgaWYgKC9bQS1aXS8udGVzdChjb3ZlcmFnZUZvbGRlck5hbWUpKSB7XG4gICAgY292ZXJhZ2VGb2xkZXJOYW1lID0gc3RyaW5ncy5kYXNoZXJpemUoY292ZXJhZ2VGb2xkZXJOYW1lKTtcbiAgfVxuXG4gIGNvbnN0IHdvcmtzcGFjZVJvb3RSZXF1aXJlID0gY3JlYXRlUmVxdWlyZSh3b3Jrc3BhY2VSb290ICsgJy8nKTtcblxuICAvLyBBbnkgY2hhbmdlcyB0byB0aGUgY29uZmlnIGhlcmUgbmVlZCB0byBiZSBzeW5jZWQgdG86IHBhY2thZ2VzL3NjaGVtYXRpY3MvYW5ndWxhci9jb25maWcvZmlsZXMva2FybWEuY29uZi5qcy50ZW1wbGF0ZVxuICByZXR1cm4ge1xuICAgIGJhc2VQYXRoOiAnJyxcbiAgICBmcmFtZXdvcmtzOiBbJ2phc21pbmUnLCAnQGFuZ3VsYXItZGV2a2l0L2J1aWxkLWFuZ3VsYXInXSxcbiAgICBwbHVnaW5zOiBbXG4gICAgICAna2FybWEtamFzbWluZScsXG4gICAgICAna2FybWEtY2hyb21lLWxhdW5jaGVyJyxcbiAgICAgICdrYXJtYS1qYXNtaW5lLWh0bWwtcmVwb3J0ZXInLFxuICAgICAgJ2thcm1hLWNvdmVyYWdlJyxcbiAgICAgICdAYW5ndWxhci1kZXZraXQvYnVpbGQtYW5ndWxhci9wbHVnaW5zL2thcm1hJyxcbiAgICBdLm1hcCgocCkgPT4gd29ya3NwYWNlUm9vdFJlcXVpcmUocCkpLFxuICAgIGphc21pbmVIdG1sUmVwb3J0ZXI6IHtcbiAgICAgIHN1cHByZXNzQWxsOiB0cnVlLCAvLyByZW1vdmVzIHRoZSBkdXBsaWNhdGVkIHRyYWNlc1xuICAgIH0sXG4gICAgY292ZXJhZ2VSZXBvcnRlcjoge1xuICAgICAgZGlyOiBwYXRoLmpvaW4od29ya3NwYWNlUm9vdCwgJ2NvdmVyYWdlJywgY292ZXJhZ2VGb2xkZXJOYW1lKSxcbiAgICAgIHN1YmRpcjogJy4nLFxuICAgICAgcmVwb3J0ZXJzOiBbeyB0eXBlOiAnaHRtbCcgfSwgeyB0eXBlOiAndGV4dC1zdW1tYXJ5JyB9XSxcbiAgICB9LFxuICAgIHJlcG9ydGVyczogWydwcm9ncmVzcycsICdramh0bWwnXSxcbiAgICBicm93c2VyczogWydDaHJvbWUnXSxcbiAgICBjdXN0b21MYXVuY2hlcnM6IHtcbiAgICAgIC8vIENocm9tZSBjb25maWd1cmVkIHRvIHJ1biBpbiBhIGJhemVsIHNhbmRib3guXG4gICAgICAvLyBEaXNhYmxlIHRoZSB1c2Ugb2YgdGhlIGdwdSBhbmQgYC9kZXYvc2htYCBiZWNhdXNlIGl0IGNhdXNlcyBDaHJvbWUgdG9cbiAgICAgIC8vIGNyYXNoIG9uIHNvbWUgZW52aXJvbm1lbnRzLlxuICAgICAgLy8gU2VlOlxuICAgICAgLy8gICBodHRwczovL2dpdGh1Yi5jb20vcHVwcGV0ZWVyL3B1cHBldGVlci9ibG9iL3YxLjAuMC9kb2NzL3Ryb3VibGVzaG9vdGluZy5tZCN0aXBzXG4gICAgICAvLyAgIGh0dHBzOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzUwNjQyMzA4L3dlYmRyaXZlcmV4Y2VwdGlvbi11bmtub3duLWVycm9yLWRldnRvb2xzYWN0aXZlcG9ydC1maWxlLWRvZXNudC1leGlzdC13aGlsZS10XG4gICAgICBDaHJvbWVIZWFkbGVzc05vU2FuZGJveDoge1xuICAgICAgICBiYXNlOiAnQ2hyb21lSGVhZGxlc3MnLFxuICAgICAgICBmbGFnczogWyctLW5vLXNhbmRib3gnLCAnLS1oZWFkbGVzcycsICctLWRpc2FibGUtZ3B1JywgJy0tZGlzYWJsZS1kZXYtc2htLXVzYWdlJ10sXG4gICAgICB9LFxuICAgIH0sXG4gICAgcmVzdGFydE9uRmlsZUNoYW5nZTogdHJ1ZSxcbiAgfTtcbn1cblxuZXhwb3J0IHsgS2FybWFCdWlsZGVyT3B0aW9ucyB9O1xuZXhwb3J0IGRlZmF1bHQgY3JlYXRlQnVpbGRlcjxSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ICYgS2FybWFCdWlsZGVyT3B0aW9ucz4oZXhlY3V0ZSk7XG5cbmZ1bmN0aW9uIGdldEJ1aWx0SW5NYWluRmlsZSgpOiBzdHJpbmcge1xuICBjb25zdCBjb250ZW50ID0gQnVmZmVyLmZyb20oXG4gICAgYFxuICBpbXBvcnQgeyBnZXRUZXN0QmVkIH0gZnJvbSAnQGFuZ3VsYXIvY29yZS90ZXN0aW5nJztcbiAgaW1wb3J0IHtcbiAgICBCcm93c2VyRHluYW1pY1Rlc3RpbmdNb2R1bGUsXG4gICAgcGxhdGZvcm1Ccm93c2VyRHluYW1pY1Rlc3RpbmcsXG4gICB9IGZyb20gJ0Bhbmd1bGFyL3BsYXRmb3JtLWJyb3dzZXItZHluYW1pYy90ZXN0aW5nJztcblxuICAvLyBJbml0aWFsaXplIHRoZSBBbmd1bGFyIHRlc3RpbmcgZW52aXJvbm1lbnQuXG4gIGdldFRlc3RCZWQoKS5pbml0VGVzdEVudmlyb25tZW50KEJyb3dzZXJEeW5hbWljVGVzdGluZ01vZHVsZSwgcGxhdGZvcm1Ccm93c2VyRHluYW1pY1Rlc3RpbmcoKSwge1xuICAgIGVycm9yT25Vbmtub3duRWxlbWVudHM6IHRydWUsXG4gICAgZXJyb3JPblVua25vd25Qcm9wZXJ0aWVzOiB0cnVlXG4gIH0pO1xuYCxcbiAgKS50b1N0cmluZygnYmFzZTY0Jyk7XG5cbiAgcmV0dXJuIGBuZy12aXJ0dWFsLW1haW4uanMhPSFkYXRhOnRleHQvamF2YXNjcmlwdDtiYXNlNjQsJHtjb250ZW50fWA7XG59XG4iXX0=