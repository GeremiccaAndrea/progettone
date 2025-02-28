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
exports.AngularWebpackPlugin = void 0;
const assert_1 = require("assert");
const ts = __importStar(require("typescript"));
const paths_plugin_1 = require("../paths-plugin");
const resource_loader_1 = require("../resource_loader");
const cache_1 = require("./cache");
const diagnostics_1 = require("./diagnostics");
const host_1 = require("./host");
const paths_1 = require("./paths");
const symbol_1 = require("./symbol");
const system_1 = require("./system");
const transformation_1 = require("./transformation");
/**
 * The threshold used to determine whether Angular file diagnostics should optimize for full programs
 * or single files. If the number of affected files for a build is more than the threshold, full
 * program optimization will be used.
 */
const DIAGNOSTICS_AFFECTED_THRESHOLD = 1;
const PLUGIN_NAME = 'angular-compiler';
const compilationFileEmitters = new WeakMap();
class AngularWebpackPlugin {
    constructor(options = {}) {
        this.fileDependencies = new Map();
        this.requiredFilesToEmit = new Set();
        this.requiredFilesToEmitCache = new Map();
        this.fileEmitHistory = new Map();
        this.pluginOptions = {
            emitClassMetadata: false,
            emitNgModuleScope: false,
            jitMode: false,
            fileReplacements: {},
            substitutions: {},
            directTemplateLoading: true,
            tsconfig: 'tsconfig.json',
            ...options,
        };
    }
    get compilerCli() {
        // The compilerCliModule field is guaranteed to be defined during a compilation
        // due to the `beforeCompile` hook. Usage of this property accessor prior to the
        // hook execution is an implementation error.
        assert_1.strict.ok(this.compilerCliModule, `'@angular/compiler-cli' used prior to Webpack compilation.`);
        return this.compilerCliModule;
    }
    get options() {
        return this.pluginOptions;
    }
    apply(compiler) {
        const { NormalModuleReplacementPlugin, WebpackError, util } = compiler.webpack;
        this.webpackCreateHash = util.createHash;
        // Setup file replacements with webpack
        for (const [key, value] of Object.entries(this.pluginOptions.fileReplacements)) {
            new NormalModuleReplacementPlugin(new RegExp('^' + key.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&') + '$'), value).apply(compiler);
        }
        // Set resolver options
        const pathsPlugin = new paths_plugin_1.TypeScriptPathsPlugin();
        compiler.hooks.afterResolvers.tap(PLUGIN_NAME, (compiler) => {
            compiler.resolverFactory.hooks.resolveOptions
                .for('normal')
                .tap(PLUGIN_NAME, (resolveOptions) => {
                resolveOptions.plugins ?? (resolveOptions.plugins = []);
                resolveOptions.plugins.push(pathsPlugin);
                return resolveOptions;
            });
        });
        // Load the compiler-cli if not already available
        compiler.hooks.beforeCompile.tapPromise(PLUGIN_NAME, () => this.initializeCompilerCli());
        const compilationState = { pathsPlugin };
        compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
            try {
                this.setupCompilation(compilation, compilationState);
            }
            catch (error) {
                (0, diagnostics_1.addError)(compilation, `Failed to initialize Angular compilation - ${error instanceof Error ? error.message : error}`);
            }
        });
    }
    setupCompilation(compilation, state) {
        const compiler = compilation.compiler;
        // Register plugin to ensure deterministic emit order in multi-plugin usage
        const emitRegistration = this.registerWithCompilation(compilation);
        this.watchMode = compiler.watchMode;
        // Initialize webpack cache
        if (!this.webpackCache && compilation.options.cache) {
            this.webpackCache = compilation.getCache(PLUGIN_NAME);
        }
        // Initialize the resource loader if not already setup
        if (!state.resourceLoader) {
            state.resourceLoader = new resource_loader_1.WebpackResourceLoader(this.watchMode);
        }
        // Setup and read TypeScript and Angular compiler configuration
        const { compilerOptions, rootNames, errors } = this.loadConfiguration();
        // Create diagnostics reporter and report configuration file errors
        const diagnosticsReporter = (0, diagnostics_1.createDiagnosticsReporter)(compilation, (diagnostic) => this.compilerCli.formatDiagnostics([diagnostic]));
        diagnosticsReporter(errors);
        // Update TypeScript path mapping plugin with new configuration
        state.pathsPlugin.update(compilerOptions);
        // Create a Webpack-based TypeScript compiler host
        const system = (0, system_1.createWebpackSystem)(
        // Webpack lacks an InputFileSytem type definition with sync functions
        compiler.inputFileSystem, (0, paths_1.normalizePath)(compiler.context));
        const host = ts.createIncrementalCompilerHost(compilerOptions, system);
        // Setup source file caching and reuse cache from previous compilation if present
        let cache = this.sourceFileCache;
        let changedFiles;
        if (cache) {
            changedFiles = new Set();
            for (const changedFile of [
                ...(compiler.modifiedFiles ?? []),
                ...(compiler.removedFiles ?? []),
            ]) {
                const normalizedChangedFile = (0, paths_1.normalizePath)(changedFile);
                // Invalidate file dependencies
                this.fileDependencies.delete(normalizedChangedFile);
                // Invalidate existing cache
                cache.invalidate(normalizedChangedFile);
                changedFiles.add(normalizedChangedFile);
            }
        }
        else {
            // Initialize a new cache
            cache = new cache_1.SourceFileCache();
            // Only store cache if in watch mode
            if (this.watchMode) {
                this.sourceFileCache = cache;
            }
        }
        (0, host_1.augmentHostWithCaching)(host, cache);
        const moduleResolutionCache = ts.createModuleResolutionCache(host.getCurrentDirectory(), host.getCanonicalFileName.bind(host), compilerOptions);
        // Setup source file dependency collection
        (0, host_1.augmentHostWithDependencyCollection)(host, this.fileDependencies, moduleResolutionCache);
        // Setup resource loading
        state.resourceLoader.update(compilation, changedFiles);
        (0, host_1.augmentHostWithResources)(host, state.resourceLoader, {
            directTemplateLoading: this.pluginOptions.directTemplateLoading,
            inlineStyleFileExtension: this.pluginOptions.inlineStyleFileExtension,
        });
        // Setup source file adjustment options
        (0, host_1.augmentHostWithReplacements)(host, this.pluginOptions.fileReplacements, moduleResolutionCache);
        (0, host_1.augmentHostWithSubstitutions)(host, this.pluginOptions.substitutions);
        // Create the file emitter used by the webpack loader
        const { fileEmitter, builder, internalFiles } = this.pluginOptions.jitMode
            ? this.updateJitProgram(compilerOptions, rootNames, host, diagnosticsReporter)
            : this.updateAotProgram(compilerOptions, rootNames, host, diagnosticsReporter, state.resourceLoader);
        // Set of files used during the unused TypeScript file analysis
        const currentUnused = new Set();
        for (const sourceFile of builder.getSourceFiles()) {
            if (internalFiles?.has(sourceFile)) {
                continue;
            }
            // Ensure all program files are considered part of the compilation and will be watched.
            // Webpack does not normalize paths. Therefore, we need to normalize the path with FS seperators.
            compilation.fileDependencies.add((0, paths_1.externalizePath)(sourceFile.fileName));
            // Add all non-declaration files to the initial set of unused files. The set will be
            // analyzed and pruned after all Webpack modules are finished building.
            if (!sourceFile.isDeclarationFile) {
                currentUnused.add((0, paths_1.normalizePath)(sourceFile.fileName));
            }
        }
        compilation.hooks.finishModules.tapPromise(PLUGIN_NAME, async (modules) => {
            // Rebuild any remaining AOT required modules
            await this.rebuildRequiredFiles(modules, compilation, fileEmitter);
            // Clear out the Webpack compilation to avoid an extra retaining reference
            state.resourceLoader?.clearParentCompilation();
            // Analyze program for unused files
            if (compilation.errors.length > 0) {
                return;
            }
            for (const webpackModule of modules) {
                const resource = webpackModule.resource;
                if (resource) {
                    this.markResourceUsed((0, paths_1.normalizePath)(resource), currentUnused);
                }
            }
            for (const unused of currentUnused) {
                if (state.previousUnused?.has(unused)) {
                    continue;
                }
                (0, diagnostics_1.addWarning)(compilation, `${unused} is part of the TypeScript compilation but it's unused.\n` +
                    `Add only entry points to the 'files' or 'include' properties in your tsconfig.`);
            }
            state.previousUnused = currentUnused;
        });
        // Store file emitter for loader usage
        emitRegistration.update(fileEmitter);
    }
    registerWithCompilation(compilation) {
        let fileEmitters = compilationFileEmitters.get(compilation);
        if (!fileEmitters) {
            fileEmitters = new symbol_1.FileEmitterCollection();
            compilationFileEmitters.set(compilation, fileEmitters);
            compilation.compiler.webpack.NormalModule.getCompilationHooks(compilation).loader.tap(PLUGIN_NAME, (context) => {
                const loaderContext = context;
                loaderContext[symbol_1.AngularPluginSymbol] = fileEmitters;
            });
        }
        const emitRegistration = fileEmitters.register();
        return emitRegistration;
    }
    markResourceUsed(normalizedResourcePath, currentUnused) {
        if (!currentUnused.has(normalizedResourcePath)) {
            return;
        }
        currentUnused.delete(normalizedResourcePath);
        const dependencies = this.fileDependencies.get(normalizedResourcePath);
        if (!dependencies) {
            return;
        }
        for (const dependency of dependencies) {
            this.markResourceUsed((0, paths_1.normalizePath)(dependency), currentUnused);
        }
    }
    async rebuildRequiredFiles(modules, compilation, fileEmitter) {
        if (this.requiredFilesToEmit.size === 0) {
            return;
        }
        const filesToRebuild = new Set();
        for (const requiredFile of this.requiredFilesToEmit) {
            const history = await this.getFileEmitHistory(requiredFile);
            if (history) {
                const emitResult = await fileEmitter(requiredFile);
                if (emitResult?.content === undefined ||
                    history.length !== emitResult.content.length ||
                    emitResult.hash === undefined ||
                    Buffer.compare(history.hash, emitResult.hash) !== 0) {
                    // New emit result is different so rebuild using new emit result
                    this.requiredFilesToEmitCache.set(requiredFile, emitResult);
                    filesToRebuild.add(requiredFile);
                }
            }
            else {
                // No emit history so rebuild
                filesToRebuild.add(requiredFile);
            }
        }
        if (filesToRebuild.size > 0) {
            const rebuild = (webpackModule) => new Promise((resolve) => compilation.rebuildModule(webpackModule, () => resolve()));
            const modulesToRebuild = [];
            for (const webpackModule of modules) {
                const resource = webpackModule.resource;
                if (resource && filesToRebuild.has((0, paths_1.normalizePath)(resource))) {
                    modulesToRebuild.push(webpackModule);
                }
            }
            await Promise.all(modulesToRebuild.map((webpackModule) => rebuild(webpackModule)));
        }
        this.requiredFilesToEmit.clear();
        this.requiredFilesToEmitCache.clear();
    }
    loadConfiguration() {
        const { options: compilerOptions, rootNames, errors, } = this.compilerCli.readConfiguration(this.pluginOptions.tsconfig, this.pluginOptions.compilerOptions);
        compilerOptions.noEmitOnError = false;
        compilerOptions.suppressOutputPathCheck = true;
        compilerOptions.outDir = undefined;
        compilerOptions.inlineSources = compilerOptions.sourceMap;
        compilerOptions.inlineSourceMap = false;
        compilerOptions.mapRoot = undefined;
        compilerOptions.sourceRoot = undefined;
        compilerOptions.allowEmptyCodegenFiles = false;
        compilerOptions.annotationsAs = 'decorators';
        compilerOptions.enableResourceInlining = false;
        return { compilerOptions, rootNames, errors };
    }
    updateAotProgram(compilerOptions, rootNames, host, diagnosticsReporter, resourceLoader) {
        // Create the Angular specific program that contains the Angular compiler
        const angularProgram = new this.compilerCli.NgtscProgram(rootNames, compilerOptions, host, this.ngtscNextProgram);
        const angularCompiler = angularProgram.compiler;
        // The `ignoreForEmit` return value can be safely ignored when emitting. Only files
        // that will be bundled (requested by Webpack) will be emitted. Combined with TypeScript's
        // eliding of type only imports, this will cause type only files to be automatically ignored.
        // Internal Angular type check files are also not resolvable by the bundler. Even if they
        // were somehow errantly imported, the bundler would error before an emit was attempted.
        // Diagnostics are still collected for all files which requires using `ignoreForDiagnostics`.
        const { ignoreForDiagnostics, ignoreForEmit } = angularCompiler;
        // SourceFile versions are required for builder programs.
        // The wrapped host inside NgtscProgram adds additional files that will not have versions.
        const typeScriptProgram = angularProgram.getTsProgram();
        (0, host_1.augmentProgramWithVersioning)(typeScriptProgram);
        let builder;
        if (this.watchMode) {
            builder = this.builder = ts.createEmitAndSemanticDiagnosticsBuilderProgram(typeScriptProgram, host, this.builder);
            this.ngtscNextProgram = angularProgram;
        }
        else {
            // When not in watch mode, the startup cost of the incremental analysis can be avoided by
            // using an abstract builder that only wraps a TypeScript program.
            builder = ts.createAbstractBuilder(typeScriptProgram, host);
        }
        // Update semantic diagnostics cache
        const affectedFiles = new Set();
        // Analyze affected files when in watch mode for incremental type checking
        if ('getSemanticDiagnosticsOfNextAffectedFile' in builder) {
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const result = builder.getSemanticDiagnosticsOfNextAffectedFile(undefined, (sourceFile) => {
                    // If the affected file is a TTC shim, add the shim's original source file.
                    // This ensures that changes that affect TTC are typechecked even when the changes
                    // are otherwise unrelated from a TS perspective and do not result in Ivy codegen changes.
                    // For example, changing @Input property types of a directive used in another component's
                    // template.
                    if (ignoreForDiagnostics.has(sourceFile) &&
                        sourceFile.fileName.endsWith('.ngtypecheck.ts')) {
                        // This file name conversion relies on internal compiler logic and should be converted
                        // to an official method when available. 15 is length of `.ngtypecheck.ts`
                        const originalFilename = sourceFile.fileName.slice(0, -15) + '.ts';
                        const originalSourceFile = builder.getSourceFile(originalFilename);
                        if (originalSourceFile) {
                            affectedFiles.add(originalSourceFile);
                        }
                        return true;
                    }
                    return false;
                });
                if (!result) {
                    break;
                }
                affectedFiles.add(result.affected);
            }
        }
        // Collect program level diagnostics
        const diagnostics = [
            ...angularCompiler.getOptionDiagnostics(),
            ...builder.getOptionsDiagnostics(),
            ...builder.getGlobalDiagnostics(),
        ];
        diagnosticsReporter(diagnostics);
        // Collect source file specific diagnostics
        for (const sourceFile of builder.getSourceFiles()) {
            if (!ignoreForDiagnostics.has(sourceFile)) {
                diagnosticsReporter(builder.getSyntacticDiagnostics(sourceFile));
                diagnosticsReporter(builder.getSemanticDiagnostics(sourceFile));
            }
        }
        const transformers = (0, transformation_1.createAotTransformers)(builder, this.pluginOptions);
        const getDependencies = (sourceFile) => {
            const dependencies = [];
            for (const resourcePath of angularCompiler.getResourceDependencies(sourceFile)) {
                dependencies.push(resourcePath, 
                // Retrieve all dependencies of the resource (stylesheet imports, etc.)
                ...resourceLoader.getResourceDependencies(resourcePath));
            }
            return dependencies;
        };
        // Required to support asynchronous resource loading
        // Must be done before creating transformers or getting template diagnostics
        const pendingAnalysis = angularCompiler
            .analyzeAsync()
            .then(() => {
            this.requiredFilesToEmit.clear();
            for (const sourceFile of builder.getSourceFiles()) {
                if (sourceFile.isDeclarationFile) {
                    continue;
                }
                // Collect sources that are required to be emitted
                if (!ignoreForEmit.has(sourceFile) &&
                    !angularCompiler.incrementalCompilation.safeToSkipEmit(sourceFile)) {
                    this.requiredFilesToEmit.add((0, paths_1.normalizePath)(sourceFile.fileName));
                    // If required to emit, diagnostics may have also changed
                    if (!ignoreForDiagnostics.has(sourceFile)) {
                        affectedFiles.add(sourceFile);
                    }
                }
                else if (this.sourceFileCache &&
                    !affectedFiles.has(sourceFile) &&
                    !ignoreForDiagnostics.has(sourceFile)) {
                    // Use cached Angular diagnostics for unchanged and unaffected files
                    const angularDiagnostics = this.sourceFileCache.getAngularDiagnostics(sourceFile);
                    if (angularDiagnostics) {
                        diagnosticsReporter(angularDiagnostics);
                    }
                }
            }
            // Collect new Angular diagnostics for files affected by changes
            const OptimizeFor = this.compilerCli.OptimizeFor;
            const optimizeDiagnosticsFor = affectedFiles.size <= DIAGNOSTICS_AFFECTED_THRESHOLD
                ? OptimizeFor.SingleFile
                : OptimizeFor.WholeProgram;
            for (const affectedFile of affectedFiles) {
                const angularDiagnostics = angularCompiler.getDiagnosticsForFile(affectedFile, optimizeDiagnosticsFor);
                diagnosticsReporter(angularDiagnostics);
                this.sourceFileCache?.updateAngularDiagnostics(affectedFile, angularDiagnostics);
            }
            return {
                emitter: this.createFileEmitter(builder, (0, transformation_1.mergeTransformers)(angularCompiler.prepareEmit().transformers, transformers), getDependencies, (sourceFile) => {
                    this.requiredFilesToEmit.delete((0, paths_1.normalizePath)(sourceFile.fileName));
                    angularCompiler.incrementalCompilation.recordSuccessfulEmit(sourceFile);
                }),
            };
        })
            .catch((err) => ({ errorMessage: err instanceof Error ? err.message : `${err}` }));
        const analyzingFileEmitter = async (file) => {
            const analysis = await pendingAnalysis;
            if ('errorMessage' in analysis) {
                throw new Error(analysis.errorMessage);
            }
            return analysis.emitter(file);
        };
        return {
            fileEmitter: analyzingFileEmitter,
            builder,
            internalFiles: ignoreForEmit,
        };
    }
    updateJitProgram(compilerOptions, rootNames, host, diagnosticsReporter) {
        let builder;
        if (this.watchMode) {
            builder = this.builder = ts.createEmitAndSemanticDiagnosticsBuilderProgram(rootNames, compilerOptions, host, this.builder);
        }
        else {
            // When not in watch mode, the startup cost of the incremental analysis can be avoided by
            // using an abstract builder that only wraps a TypeScript program.
            builder = ts.createAbstractBuilder(rootNames, compilerOptions, host);
        }
        const diagnostics = [
            ...builder.getOptionsDiagnostics(),
            ...builder.getGlobalDiagnostics(),
            ...builder.getSyntacticDiagnostics(),
            // Gather incremental semantic diagnostics
            ...builder.getSemanticDiagnostics(),
        ];
        diagnosticsReporter(diagnostics);
        const transformers = (0, transformation_1.createJitTransformers)(builder, this.compilerCli, this.pluginOptions);
        return {
            fileEmitter: this.createFileEmitter(builder, transformers, () => []),
            builder,
            internalFiles: undefined,
        };
    }
    createFileEmitter(program, transformers = {}, getExtraDependencies, onAfterEmit) {
        return async (file) => {
            const filePath = (0, paths_1.normalizePath)(file);
            if (this.requiredFilesToEmitCache.has(filePath)) {
                return this.requiredFilesToEmitCache.get(filePath);
            }
            const sourceFile = program.getSourceFile(filePath);
            if (!sourceFile) {
                return undefined;
            }
            let content;
            let map;
            program.emit(sourceFile, (filename, data) => {
                if (filename.endsWith('.map')) {
                    map = data;
                }
                else if (filename.endsWith('.js')) {
                    content = data;
                }
            }, undefined, undefined, transformers);
            onAfterEmit?.(sourceFile);
            // Capture emit history info for Angular rebuild analysis
            const hash = content ? (await this.addFileEmitHistory(filePath, content)).hash : undefined;
            const dependencies = [
                ...(this.fileDependencies.get(filePath) || []),
                ...getExtraDependencies(sourceFile),
            ].map(paths_1.externalizePath);
            return { content, map, dependencies, hash };
        };
    }
    async initializeCompilerCli() {
        if (this.compilerCliModule) {
            return;
        }
        // This uses a dynamic import to load `@angular/compiler-cli` which may be ESM.
        // CommonJS code can load ESM code via a dynamic import. Unfortunately, TypeScript
        // will currently, unconditionally downlevel dynamic import into a require call.
        // require calls cannot load ESM code and will result in a runtime error. To workaround
        // this, a Function constructor is used to prevent TypeScript from changing the dynamic import.
        // Once TypeScript provides support for keeping the dynamic import this workaround can
        // be dropped.
        this.compilerCliModule = await new Function(`return import('@angular/compiler-cli');`)();
    }
    async addFileEmitHistory(filePath, content) {
        assert_1.strict.ok(this.webpackCreateHash, 'File emitter is used prior to Webpack compilation');
        const historyData = {
            length: content.length,
            hash: this.webpackCreateHash('xxhash64').update(content).digest(),
        };
        if (this.webpackCache) {
            const history = await this.getFileEmitHistory(filePath);
            if (!history || Buffer.compare(history.hash, historyData.hash) !== 0) {
                // Hash doesn't match or item doesn't exist.
                await this.webpackCache.storePromise(filePath, null, historyData);
            }
        }
        else if (this.watchMode) {
            // The in memory file emit history is only required during watch mode.
            this.fileEmitHistory.set(filePath, historyData);
        }
        return historyData;
    }
    async getFileEmitHistory(filePath) {
        return this.webpackCache
            ? this.webpackCache.getPromise(filePath, null)
            : this.fileEmitHistory.get(filePath);
    }
}
exports.AngularWebpackPlugin = AngularWebpackPlugin;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGx1Z2luLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vLi4vLi4vLi4vLi4vcGFja2FnZXMvbmd0b29scy93ZWJwYWNrL3NyYy9pdnkvcGx1Z2luLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBR0gsbUNBQTBDO0FBQzFDLCtDQUFpQztBQUVqQyxrREFBd0Q7QUFDeEQsd0RBQTJEO0FBQzNELG1DQUEwQztBQUMxQywrQ0FLdUI7QUFDdkIsaUNBT2dCO0FBQ2hCLG1DQUF5RDtBQUN6RCxxQ0FBbUc7QUFDbkcscUNBQW9FO0FBQ3BFLHFEQUFtRztBQUVuRzs7OztHQUlHO0FBQ0gsTUFBTSw4QkFBOEIsR0FBRyxDQUFDLENBQUM7QUF1QnpDLE1BQU0sV0FBVyxHQUFHLGtCQUFrQixDQUFDO0FBQ3ZDLE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxPQUFPLEVBQXNDLENBQUM7QUFPbEYsTUFBYSxvQkFBb0I7SUFjL0IsWUFBWSxVQUFnRCxFQUFFO1FBTDdDLHFCQUFnQixHQUFHLElBQUksR0FBRyxFQUF1QixDQUFDO1FBQ2xELHdCQUFtQixHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFDeEMsNkJBQXdCLEdBQUcsSUFBSSxHQUFHLEVBQXNDLENBQUM7UUFDekUsb0JBQWUsR0FBRyxJQUFJLEdBQUcsRUFBK0IsQ0FBQztRQUd4RSxJQUFJLENBQUMsYUFBYSxHQUFHO1lBQ25CLGlCQUFpQixFQUFFLEtBQUs7WUFDeEIsaUJBQWlCLEVBQUUsS0FBSztZQUN4QixPQUFPLEVBQUUsS0FBSztZQUNkLGdCQUFnQixFQUFFLEVBQUU7WUFDcEIsYUFBYSxFQUFFLEVBQUU7WUFDakIscUJBQXFCLEVBQUUsSUFBSTtZQUMzQixRQUFRLEVBQUUsZUFBZTtZQUN6QixHQUFHLE9BQU87U0FDWCxDQUFDO0lBQ0osQ0FBQztJQUVELElBQVksV0FBVztRQUNyQiwrRUFBK0U7UUFD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QUFDLFlBQVksQ0FBQyxZQUFZLENBQUMsUUFBUSxFQUFFLElBQUksRUFBRSxXQUFXLENBQUMsQ0FBQzthQUNuRTtTQUNGO2FBQU0sSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFO1lBQ3pCLHNFQUFzRTtZQUN0RSxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsV0FBVyxDQUFDLENBQUM7U0FDakQ7UUFFRCxPQUFPLFdBQVcsQ0FBQztJQUNyQixDQUFDO0lBRU8sS0FBSyxDQUFDLGtCQUFrQixDQUFDLFFBQWdCO1FBQy9DLE9BQU8sSUFBSSxDQUFDLFlBQVk7WUFDdEIsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFrQyxRQUFRLEVBQUUsSUFBSSxDQUFDO1lBQy9FLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQztJQUN6QyxDQUFDO0NBQ0Y7QUF6cEJELG9EQXlwQkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEBsaWNlbnNlXG4gKiBDb3B5cmlnaHQgR29vZ2xlIExMQyBBbGwgUmlnaHRzIFJlc2VydmVkLlxuICpcbiAqIFVzZSBvZiB0aGlzIHNvdXJjZSBjb2RlIGlzIGdvdmVybmVkIGJ5IGFuIE1JVC1zdHlsZSBsaWNlbnNlIHRoYXQgY2FuIGJlXG4gKiBmb3VuZCBpbiB0aGUgTElDRU5TRSBmaWxlIGF0IGh0dHBzOi8vYW5ndWxhci5pby9saWNlbnNlXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBDb21waWxlckhvc3QsIENvbXBpbGVyT3B0aW9ucywgTmd0c2NQcm9ncmFtIH0gZnJvbSAnQGFuZ3VsYXIvY29tcGlsZXItY2xpJztcbmltcG9ydCB7IHN0cmljdCBhcyBhc3NlcnQgfSBmcm9tICdhc3NlcnQnO1xuaW1wb3J0ICogYXMgdHMgZnJvbSAndHlwZXNjcmlwdCc7XG5pbXBvcnQgdHlwZSB7IENvbXBpbGF0aW9uLCBDb21waWxlciwgTW9kdWxlLCBOb3JtYWxNb2R1bGUgfSBmcm9tICd3ZWJwYWNrJztcbmltcG9ydCB7IFR5cGVTY3JpcHRQYXRoc1BsdWdpbiB9IGZyb20gJy4uL3BhdGhzLXBsdWdpbic7XG5pbXBvcnQgeyBXZWJwYWNrUmVzb3VyY2VMb2FkZXIgfSBmcm9tICcuLi9yZXNvdXJjZV9sb2FkZXInO1xuaW1wb3J0IHsgU291cmNlRmlsZUNhY2hlIH0gZnJvbSAnLi9jYWNoZSc7XG5pbXBvcnQge1xuICBEaWFnbm9zdGljc1JlcG9ydGVyLFxuICBhZGRFcnJvcixcbiAgYWRkV2FybmluZyxcbiAgY3JlYXRlRGlhZ25vc3RpY3NSZXBvcnRlcixcbn0gZnJvbSAnLi9kaWFnbm9zdGljcyc7XG5pbXBvcnQge1xuICBhdWdtZW50SG9zdFdpdGhDYWNoaW5nLFxuICBhdWdtZW50SG9zdFdpdGhEZXBlbmRlbmN5Q29sbGVjdGlvbixcbiAgYXVnbWVudEhvc3RXaXRoUmVwbGFjZW1lbnRzLFxuICBhdWdtZW50SG9zdFdpdGhSZXNvdXJjZXMsXG4gIGF1Z21lbnRIb3N0V2l0aFN1YnN0aXR1dGlvbnMsXG4gIGF1Z21lbnRQcm9ncmFtV2l0aFZlcnNpb25pbmcsXG59IGZyb20gJy4vaG9zdCc7XG5pbXBvcnQgeyBleHRlcm5hbGl6ZVBhdGgsIG5vcm1hbGl6ZVBhdGggfSBmcm9tICcuL3BhdGhzJztcbmltcG9ydCB7IEFuZ3VsYXJQbHVnaW5TeW1ib2wsIEVtaXRGaWxlUmVzdWx0LCBGaWxlRW1pdHRlciwgRmlsZUVtaXR0ZXJDb2xsZWN0aW9uIH0gZnJvbSAnLi9zeW1ib2wnO1xuaW1wb3J0IHsgSW5wdXRGaWxlU3lzdGVtU3luYywgY3JlYXRlV2VicGFja1N5c3RlbSB9IGZyb20gJy4vc3lzdGVtJztcbmltcG9ydCB7IGNyZWF0ZUFvdFRyYW5zZm9ybWVycywgY3JlYXRlSml0VHJhbnNmb3JtZXJzLCBtZXJnZVRyYW5zZm9ybWVycyB9IGZyb20gJy4vdHJhbnNmb3JtYXRpb24nO1xuXG4vKipcbiAqIFRoZSB0aHJlc2hvbGQgdXNlZCB0byBkZXRlcm1pbmUgd2hldGhlciBBbmd1bGFyIGZpbGUgZGlhZ25vc3RpY3Mgc2hvdWxkIG9wdGltaXplIGZvciBmdWxsIHByb2dyYW1zXG4gKiBvciBzaW5nbGUgZmlsZXMuIElmIHRoZSBudW1iZXIgb2YgYWZmZWN0ZWQgZmlsZXMgZm9yIGEgYnVpbGQgaXMgbW9yZSB0aGFuIHRoZSB0aHJlc2hvbGQsIGZ1bGxcbiAqIHByb2dyYW0gb3B0aW1pemF0aW9uIHdpbGwgYmUgdXNlZC5cbiAqL1xuY29uc3QgRElBR05PU1RJQ1NfQUZGRUNURURfVEhSRVNIT0xEID0gMTtcblxuZXhwb3J0IGludGVyZmFjZSBBbmd1bGFyV2VicGFja1BsdWdpbk9wdGlvbnMge1xuICB0c2NvbmZpZzogc3RyaW5nO1xuICBjb21waWxlck9wdGlvbnM/OiBDb21waWxlck9wdGlvbnM7XG4gIGZpbGVSZXBsYWNlbWVudHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG4gIHN1YnN0aXR1dGlvbnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz47XG4gIGRpcmVjdFRlbXBsYXRlTG9hZGluZzogYm9vbGVhbjtcbiAgZW1pdENsYXNzTWV0YWRhdGE6IGJvb2xlYW47XG4gIGVtaXROZ01vZHVsZVNjb3BlOiBib29sZWFuO1xuICBqaXRNb2RlOiBib29sZWFuO1xuICBpbmxpbmVTdHlsZUZpbGVFeHRlbnNpb24/OiBzdHJpbmc7XG59XG5cbi8qKlxuICogVGhlIEFuZ3VsYXIgY29tcGlsYXRpb24gc3RhdGUgdGhhdCBpcyBtYWludGFpbmVkIGFjcm9zcyBlYWNoIFdlYnBhY2sgY29tcGlsYXRpb24uXG4gKi9cbmludGVyZmFjZSBBbmd1bGFyQ29tcGlsYXRpb25TdGF0ZSB7XG4gIHJlc291cmNlTG9hZGVyPzogV2VicGFja1Jlc291cmNlTG9hZGVyO1xuICBwcmV2aW91c1VudXNlZD86IFNldDxzdHJpbmc+O1xuICBwYXRoc1BsdWdpbjogVHlwZVNjcmlwdFBhdGhzUGx1Z2luO1xufVxuXG5jb25zdCBQTFVHSU5fTkFNRSA9ICdhbmd1bGFyLWNvbXBpbGVyJztcbmNvbnN0IGNvbXBpbGF0aW9uRmlsZUVtaXR0ZXJzID0gbmV3IFdlYWtNYXA8Q29tcGlsYXRpb24sIEZpbGVFbWl0dGVyQ29sbGVjdGlvbj4oKTtcblxuaW50ZXJmYWNlIEZpbGVFbWl0SGlzdG9yeUl0ZW0ge1xuICBsZW5ndGg6IG51bWJlcjtcbiAgaGFzaDogVWludDhBcnJheTtcbn1cblxuZXhwb3J0IGNsYXNzIEFuZ3VsYXJXZWJwYWNrUGx1Z2luIHtcbiAgcHJpdmF0ZSByZWFkb25seSBwbHVnaW5PcHRpb25zOiBBbmd1bGFyV2VicGFja1BsdWdpbk9wdGlvbnM7XG4gIHByaXZhdGUgY29tcGlsZXJDbGlNb2R1bGU/OiB0eXBlb2YgaW1wb3J0KCdAYW5ndWxhci9jb21waWxlci1jbGknKTtcbiAgcHJpdmF0ZSB3YXRjaE1vZGU/OiBib29sZWFuO1xuICBwcml2YXRlIG5ndHNjTmV4dFByb2dyYW0/OiBOZ3RzY1Byb2dyYW07XG4gIHByaXZhdGUgYnVpbGRlcj86IHRzLkVtaXRBbmRTZW1hbnRpY0RpYWdub3N0aWNzQnVpbGRlclByb2dyYW07XG4gIHByaXZhdGUgc291cmNlRmlsZUNhY2hlPzogU291cmNlRmlsZUNhY2hlO1xuICBwcml2YXRlIHdlYnBhY2tDYWNoZT86IFJldHVyblR5cGU8Q29tcGlsYXRpb25bJ2dldENhY2hlJ10+O1xuICBwcml2YXRlIHdlYnBhY2tDcmVhdGVIYXNoPzogQ29tcGlsZXJbJ3dlYnBhY2snXVsndXRpbCddWydjcmVhdGVIYXNoJ107XG4gIHByaXZhdGUgcmVhZG9ubHkgZmlsZURlcGVuZGVuY2llcyA9IG5ldyBNYXA8c3RyaW5nLCBTZXQ8c3RyaW5nPj4oKTtcbiAgcHJpdmF0ZSByZWFkb25seSByZXF1aXJlZEZpbGVzVG9FbWl0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIHByaXZhdGUgcmVhZG9ubHkgcmVxdWlyZWRGaWxlc1RvRW1pdENhY2hlID0gbmV3IE1hcDxzdHJpbmcsIEVtaXRGaWxlUmVzdWx0IHwgdW5kZWZpbmVkPigpO1xuICBwcml2YXRlIHJlYWRvbmx5IGZpbGVFbWl0SGlzdG9yeSA9IG5ldyBNYXA8c3RyaW5nLCBGaWxlRW1pdEhpc3RvcnlJdGVtPigpO1xuXG4gIGNvbnN0cnVjdG9yKG9wdGlvbnM6IFBhcnRpYWw8QW5ndWxhcldlYnBhY2tQbHVnaW5PcHRpb25zPiA9IHt9KSB7XG4gICAgdGhpcy5wbHVnaW5PcHRpb25zID0ge1xuICAgICAgZW1pdENsYXNzTWV0YWRhdGE6IGZhbHNlLFxuICAgICAgZW1pdE5nTW9kdWxlU2NvcGU6IGZhbHNlLFxuICAgICAgaml0TW9kZTogZmFsc2UsXG4gICAgICBmaWxlUmVwbGFjZW1lbnRzOiB7fSxcbiAgICAgIHN1YnN0aXR1dGlvbnM6IHt9LFxuICAgICAgZGlyZWN0VGVtcGxhdGVMb2FkaW5nOiB0cnVlLFxuICAgICAgdHNjb25maWc6ICd0c2NvbmZpZy5qc29uJyxcbiAgICAgIC4uLm9wdGlvbnMsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgZ2V0IGNvbXBpbGVyQ2xpKCk6IHR5cGVvZiBpbXBvcnQoJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaScpIHtcbiAgICAvLyBUaGUgY29tcGlsZXJDbGlNb2R1bGUgZmllbGQgaXMgZ3VhcmFudGVlZCB0byBiZSBkZWZpbmVkIGR1cmluZyBhIGNvbXBpbGF0aW9uXG4gICAgLy8gZHVlIHRvIHRoZSBgYmVmb3JlQ29tcGlsZWAgaG9vay4gVXNhZ2Ugb2YgdGhpcyBwcm9wZXJ0eSBhY2Nlc3NvciBwcmlvciB0byB0aGVcbiAgICAvLyBob29rIGV4ZWN1dGlvbiBpcyBhbiBpbXBsZW1lbnRhdGlvbiBlcnJvci5cbiAgICBhc3NlcnQub2sodGhpcy5jb21waWxlckNsaU1vZHVsZSwgYCdAYW5ndWxhci9jb21waWxlci1jbGknIHVzZWQgcHJpb3IgdG8gV2VicGFjayBjb21waWxhdGlvbi5gKTtcblxuICAgIHJldHVybiB0aGlzLmNvbXBpbGVyQ2xpTW9kdWxlO1xuICB9XG5cbiAgZ2V0IG9wdGlvbnMoKTogQW5ndWxhcldlYnBhY2tQbHVnaW5PcHRpb25zIHtcbiAgICByZXR1cm4gdGhpcy5wbHVnaW5PcHRpb25zO1xuICB9XG5cbiAgYXBwbHkoY29tcGlsZXI6IENvbXBpbGVyKTogdm9pZCB7XG4gICAgY29uc3QgeyBOb3JtYWxNb2R1bGVSZXBsYWNlbWVudFBsdWdpbiwgV2VicGFja0Vycm9yLCB1dGlsIH0gPSBjb21waWxlci53ZWJwYWNrO1xuICAgIHRoaXMud2VicGFja0NyZWF0ZUhhc2ggPSB1dGlsLmNyZWF0ZUhhc2g7XG5cbiAgICAvLyBTZXR1cCBmaWxlIHJlcGxhY2VtZW50cyB3aXRoIHdlYnBhY2tcbiAgICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyh0aGlzLnBsdWdpbk9wdGlvbnMuZmlsZVJlcGxhY2VtZW50cykpIHtcbiAgICAgIG5ldyBOb3JtYWxNb2R1bGVSZXBsYWNlbWVudFBsdWdpbihcbiAgICAgICAgbmV3IFJlZ0V4cCgnXicgKyBrZXkucmVwbGFjZSgvWy4qK1xcLT9eJHt9KCl8W1xcXVxcXFxdL2csICdcXFxcJCYnKSArICckJyksXG4gICAgICAgIHZhbHVlLFxuICAgICAgKS5hcHBseShjb21waWxlcik7XG4gICAgfVxuXG4gICAgLy8gU2V0IHJlc29sdmVyIG9wdGlvbnNcbiAgICBjb25zdCBwYXRoc1BsdWdpbiA9IG5ldyBUeXBlU2NyaXB0UGF0aHNQbHVnaW4oKTtcbiAgICBjb21waWxlci5ob29rcy5hZnRlclJlc29sdmVycy50YXAoUExVR0lOX05BTUUsIChjb21waWxlcikgPT4ge1xuICAgICAgY29tcGlsZXIucmVzb2x2ZXJGYWN0b3J5Lmhvb2tzLnJlc29sdmVPcHRpb25zXG4gICAgICAgIC5mb3IoJ25vcm1hbCcpXG4gICAgICAgIC50YXAoUExVR0lOX05BTUUsIChyZXNvbHZlT3B0aW9ucykgPT4ge1xuICAgICAgICAgIHJlc29sdmVPcHRpb25zLnBsdWdpbnMgPz89IFtdO1xuICAgICAgICAgIHJlc29sdmVPcHRpb25zLnBsdWdpbnMucHVzaChwYXRoc1BsdWdpbik7XG5cbiAgICAgICAgICByZXR1cm4gcmVzb2x2ZU9wdGlvbnM7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG4gICAgLy8gTG9hZCB0aGUgY29tcGlsZXItY2xpIGlmIG5vdCBhbHJlYWR5IGF2YWlsYWJsZVxuICAgIGNvbXBpbGVyLmhvb2tzLmJlZm9yZUNvbXBpbGUudGFwUHJvbWlzZShQTFVHSU5fTkFNRSwgKCkgPT4gdGhpcy5pbml0aWFsaXplQ29tcGlsZXJDbGkoKSk7XG5cbiAgICBjb25zdCBjb21waWxhdGlvblN0YXRlOiBBbmd1bGFyQ29tcGlsYXRpb25TdGF0ZSA9IHsgcGF0aHNQbHVnaW4gfTtcbiAgICBjb21waWxlci5ob29rcy50aGlzQ29tcGlsYXRpb24udGFwKFBMVUdJTl9OQU1FLCAoY29tcGlsYXRpb24pID0+IHtcbiAgICAgIHRyeSB7XG4gICAgICAgIHRoaXMuc2V0dXBDb21waWxhdGlvbihjb21waWxhdGlvbiwgY29tcGlsYXRpb25TdGF0ZSk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBhZGRFcnJvcihcbiAgICAgICAgICBjb21waWxhdGlvbixcbiAgICAgICAgICBgRmFpbGVkIHRvIGluaXRpYWxpemUgQW5ndWxhciBjb21waWxhdGlvbiAtICR7XG4gICAgICAgICAgICBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6IGVycm9yXG4gICAgICAgICAgfWAsXG4gICAgICAgICk7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBwcml2YXRlIHNldHVwQ29tcGlsYXRpb24oY29tcGlsYXRpb246IENvbXBpbGF0aW9uLCBzdGF0ZTogQW5ndWxhckNvbXBpbGF0aW9uU3RhdGUpOiB2b2lkIHtcbiAgICBjb25zdCBjb21waWxlciA9IGNvbXBpbGF0aW9uLmNvbXBpbGVyO1xuXG4gICAgLy8gUmVnaXN0ZXIgcGx1Z2luIHRvIGVuc3VyZSBkZXRlcm1pbmlzdGljIGVtaXQgb3JkZXIgaW4gbXVsdGktcGx1Z2luIHVzYWdlXG4gICAgY29uc3QgZW1pdFJlZ2lzdHJhdGlvbiA9IHRoaXMucmVnaXN0ZXJXaXRoQ29tcGlsYXRpb24oY29tcGlsYXRpb24pO1xuICAgIHRoaXMud2F0Y2hNb2RlID0gY29tcGlsZXIud2F0Y2hNb2RlO1xuXG4gICAgLy8gSW5pdGlhbGl6ZSB3ZWJwYWNrIGNhY2hlXG4gICAgaWYgKCF0aGlzLndlYnBhY2tDYWNoZSAmJiBjb21waWxhdGlvbi5vcHRpb25zLmNhY2hlKSB7XG4gICAgICB0aGlzLndlYnBhY2tDYWNoZSA9IGNvbXBpbGF0aW9uLmdldENhY2hlKFBMVUdJTl9OQU1FKTtcbiAgICB9XG5cbiAgICAvLyBJbml0aWFsaXplIHRoZSByZXNvdXJjZSBsb2FkZXIgaWYgbm90IGFscmVhZHkgc2V0dXBcbiAgICBpZiAoIXN0YXRlLnJlc291cmNlTG9hZGVyKSB7XG4gICAgICBzdGF0ZS5yZXNvdXJjZUxvYWRlciA9IG5ldyBXZWJwYWNrUmVzb3VyY2VMb2FkZXIodGhpcy53YXRjaE1vZGUpO1xuICAgIH1cblxuICAgIC8vIFNldHVwIGFuZCByZWFkIFR5cGVTY3JpcHQgYW5kIEFuZ3VsYXIgY29tcGlsZXIgY29uZmlndXJhdGlvblxuICAgIGNvbnN0IHsgY29tcGlsZXJPcHRpb25zLCByb290TmFtZXMsIGVycm9ycyB9ID0gdGhpcy5sb2FkQ29uZmlndXJhdGlvbigpO1xuXG4gICAgLy8gQ3JlYXRlIGRpYWdub3N0aWNzIHJlcG9ydGVyIGFuZCByZXBvcnQgY29uZmlndXJhdGlvbiBmaWxlIGVycm9yc1xuICAgIGNvbnN0IGRpYWdub3N0aWNzUmVwb3J0ZXIgPSBjcmVhdGVEaWFnbm9zdGljc1JlcG9ydGVyKGNvbXBpbGF0aW9uLCAoZGlhZ25vc3RpYykgPT5cbiAgICAgIHRoaXMuY29tcGlsZXJDbGkuZm9ybWF0RGlhZ25vc3RpY3MoW2RpYWdub3N0aWNdKSxcbiAgICApO1xuICAgIGRpYWdub3N0aWNzUmVwb3J0ZXIoZXJyb3JzKTtcblxuICAgIC8vIFVwZGF0ZSBUeXBlU2NyaXB0IHBhdGggbWFwcGluZyBwbHVnaW4gd2l0aCBuZXcgY29uZmlndXJhdGlvblxuICAgIHN0YXRlLnBhdGhzUGx1Z2luLnVwZGF0ZShjb21waWxlck9wdGlvbnMpO1xuXG4gICAgLy8gQ3JlYXRlIGEgV2VicGFjay1iYXNlZCBUeXBlU2NyaXB0IGNvbXBpbGVyIGhvc3RcbiAgICBjb25zdCBzeXN0ZW0gPSBjcmVhdGVXZWJwYWNrU3lzdGVtKFxuICAgICAgLy8gV2VicGFjayBsYWNrcyBhbiBJbnB1dEZpbGVTeXRlbSB0eXBlIGRlZmluaXRpb24gd2l0aCBzeW5jIGZ1bmN0aW9uc1xuICAgICAgY29tcGlsZXIuaW5wdXRGaWxlU3lzdGVtIGFzIElucHV0RmlsZVN5c3RlbVN5bmMsXG4gICAgICBub3JtYWxpemVQYXRoKGNvbXBpbGVyLmNvbnRleHQpLFxuICAgICk7XG4gICAgY29uc3QgaG9zdCA9IHRzLmNyZWF0ZUluY3JlbWVudGFsQ29tcGlsZXJIb3N0KGNvbXBpbGVyT3B0aW9ucywgc3lzdGVtKTtcblxuICAgIC8vIFNldHVwIHNvdXJjZSBmaWxlIGNhY2hpbmcgYW5kIHJldXNlIGNhY2hlIGZyb20gcHJldmlvdXMgY29tcGlsYXRpb24gaWYgcHJlc2VudFxuICAgIGxldCBjYWNoZSA9IHRoaXMuc291cmNlRmlsZUNhY2hlO1xuICAgIGxldCBjaGFuZ2VkRmlsZXM7XG4gICAgaWYgKGNhY2hlKSB7XG4gICAgICBjaGFuZ2VkRmlsZXMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgIGZvciAoY29uc3QgY2hhbmdlZEZpbGUgb2YgW1xuICAgICAgICAuLi4oY29tcGlsZXIubW9kaWZpZWRGaWxlcyA/PyBbXSksXG4gICAgICAgIC4uLihjb21waWxlci5yZW1vdmVkRmlsZXMgPz8gW10pLFxuICAgICAgXSkge1xuICAgICAgICBjb25zdCBub3JtYWxpemVkQ2hhbmdlZEZpbGUgPSBub3JtYWxpemVQYXRoKGNoYW5nZWRGaWxlKTtcbiAgICAgICAgLy8gSW52YWxpZGF0ZSBmaWxlIGRlcGVuZGVuY2llc1xuICAgICAgICB0aGlzLmZpbGVEZXBlbmRlbmNpZXMuZGVsZXRlKG5vcm1hbGl6ZWRDaGFuZ2VkRmlsZSk7XG4gICAgICAgIC8vIEludmFsaWRhdGUgZXhpc3RpbmcgY2FjaGVcbiAgICAgICAgY2FjaGUuaW52YWxpZGF0ZShub3JtYWxpemVkQ2hhbmdlZEZpbGUpO1xuXG4gICAgICAgIGNoYW5nZWRGaWxlcy5hZGQobm9ybWFsaXplZENoYW5nZWRGaWxlKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gSW5pdGlhbGl6ZSBhIG5ldyBjYWNoZVxuICAgICAgY2FjaGUgPSBuZXcgU291cmNlRmlsZUNhY2hlKCk7XG4gICAgICAvLyBPbmx5IHN0b3JlIGNhY2hlIGlmIGluIHdhdGNoIG1vZGVcbiAgICAgIGlmICh0aGlzLndhdGNoTW9kZSkge1xuICAgICAgICB0aGlzLnNvdXJjZUZpbGVDYWNoZSA9IGNhY2hlO1xuICAgICAgfVxuICAgIH1cbiAgICBhdWdtZW50SG9zdFdpdGhDYWNoaW5nKGhvc3QsIGNhY2hlKTtcblxuICAgIGNvbnN0IG1vZHVsZVJlc29sdXRpb25DYWNoZSA9IHRzLmNyZWF0ZU1vZHVsZVJlc29sdXRpb25DYWNoZShcbiAgICAgIGhvc3QuZ2V0Q3VycmVudERpcmVjdG9yeSgpLFxuICAgICAgaG9zdC5nZXRDYW5vbmljYWxGaWxlTmFtZS5iaW5kKGhvc3QpLFxuICAgICAgY29tcGlsZXJPcHRpb25zLFxuICAgICk7XG5cbiAgICAvLyBTZXR1cCBzb3VyY2UgZmlsZSBkZXBlbmRlbmN5IGNvbGxlY3Rpb25cbiAgICBhdWdtZW50SG9zdFdpdGhEZXBlbmRlbmN5Q29sbGVjdGlvbihob3N0LCB0aGlzLmZpbGVEZXBlbmRlbmNpZXMsIG1vZHVsZVJlc29sdXRpb25DYWNoZSk7XG5cbiAgICAvLyBTZXR1cCByZXNvdXJjZSBsb2FkaW5nXG4gICAgc3RhdGUucmVzb3VyY2VMb2FkZXIudXBkYXRlKGNvbXBpbGF0aW9uLCBjaGFuZ2VkRmlsZXMpO1xuICAgIGF1Z21lbnRIb3N0V2l0aFJlc291cmNlcyhob3N0LCBzdGF0ZS5yZXNvdXJjZUxvYWRlciwge1xuICAgICAgZGlyZWN0VGVtcGxhdGVMb2FkaW5nOiB0aGlzLnBsdWdpbk9wdGlvbnMuZGlyZWN0VGVtcGxhdGVMb2FkaW5nLFxuICAgICAgaW5saW5lU3R5bGVGaWxlRXh0ZW5zaW9uOiB0aGlzLnBsdWdpbk9wdGlvbnMuaW5saW5lU3R5bGVGaWxlRXh0ZW5zaW9uLFxuICAgIH0pO1xuXG4gICAgLy8gU2V0dXAgc291cmNlIGZpbGUgYWRqdXN0bWVudCBvcHRpb25zXG4gICAgYXVnbWVudEhvc3RXaXRoUmVwbGFjZW1lbnRzKGhvc3QsIHRoaXMucGx1Z2luT3B0aW9ucy5maWxlUmVwbGFjZW1lbnRzLCBtb2R1bGVSZXNvbHV0aW9uQ2FjaGUpO1xuICAgIGF1Z21lbnRIb3N0V2l0aFN1YnN0aXR1dGlvbnMoaG9zdCwgdGhpcy5wbHVnaW5PcHRpb25zLnN1YnN0aXR1dGlvbnMpO1xuXG4gICAgLy8gQ3JlYXRlIHRoZSBmaWxlIGVtaXR0ZXIgdXNlZCBieSB0aGUgd2VicGFjayBsb2FkZXJcbiAgICBjb25zdCB7IGZpbGVFbWl0dGVyLCBidWlsZGVyLCBpbnRlcm5hbEZpbGVzIH0gPSB0aGlzLnBsdWdpbk9wdGlvbnMuaml0TW9kZVxuICAgICAgPyB0aGlzLnVwZGF0ZUppdFByb2dyYW0oY29tcGlsZXJPcHRpb25zLCByb290TmFtZXMsIGhvc3QsIGRpYWdub3N0aWNzUmVwb3J0ZXIpXG4gICAgICA6IHRoaXMudXBkYXRlQW90UHJvZ3JhbShcbiAgICAgICAgICBjb21waWxlck9wdGlvbnMsXG4gICAgICAgICAgcm9vdE5hbWVzLFxuICAgICAgICAgIGhvc3QsXG4gICAgICAgICAgZGlhZ25vc3RpY3NSZXBvcnRlcixcbiAgICAgICAgICBzdGF0ZS5yZXNvdXJjZUxvYWRlcixcbiAgICAgICAgKTtcblxuICAgIC8vIFNldCBvZiBmaWxlcyB1c2VkIGR1cmluZyB0aGUgdW51c2VkIFR5cGVTY3JpcHQgZmlsZSBhbmFseXNpc1xuICAgIGNvbnN0IGN1cnJlbnRVbnVzZWQgPSBuZXcgU2V0PHN0cmluZz4oKTtcblxuICAgIGZvciAoY29uc3Qgc291cmNlRmlsZSBvZiBidWlsZGVyLmdldFNvdXJjZUZpbGVzKCkpIHtcbiAgICAgIGlmIChpbnRlcm5hbEZpbGVzPy5oYXMoc291cmNlRmlsZSkpIHtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIC8vIEVuc3VyZSBhbGwgcHJvZ3JhbSBmaWxlcyBhcmUgY29uc2lkZXJlZCBwYXJ0IG9mIHRoZSBjb21waWxhdGlvbiBhbmQgd2lsbCBiZSB3YXRjaGVkLlxuICAgICAgLy8gV2VicGFjayBkb2VzIG5vdCBub3JtYWxpemUgcGF0aHMuIFRoZXJlZm9yZSwgd2UgbmVlZCB0byBub3JtYWxpemUgdGhlIHBhdGggd2l0aCBGUyBzZXBlcmF0b3JzLlxuICAgICAgY29tcGlsYXRpb24uZmlsZURlcGVuZGVuY2llcy5hZGQoZXh0ZXJuYWxpemVQYXRoKHNvdXJjZUZpbGUuZmlsZU5hbWUpKTtcblxuICAgICAgLy8gQWRkIGFsbCBub24tZGVjbGFyYXRpb24gZmlsZXMgdG8gdGhlIGluaXRpYWwgc2V0IG9mIHVudXNlZCBmaWxlcy4gVGhlIHNldCB3aWxsIGJlXG4gICAgICAvLyBhbmFseXplZCBhbmQgcHJ1bmVkIGFmdGVyIGFsbCBXZWJwYWNrIG1vZHVsZXMgYXJlIGZpbmlzaGVkIGJ1aWxkaW5nLlxuICAgICAgaWYgKCFzb3VyY2VGaWxlLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICAgIGN1cnJlbnRVbnVzZWQuYWRkKG5vcm1hbGl6ZVBhdGgoc291cmNlRmlsZS5maWxlTmFtZSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbXBpbGF0aW9uLmhvb2tzLmZpbmlzaE1vZHVsZXMudGFwUHJvbWlzZShQTFVHSU5fTkFNRSwgYXN5bmMgKG1vZHVsZXMpID0+IHtcbiAgICAgIC8vIFJlYnVpbGQgYW55IHJlbWFpbmluZyBBT1QgcmVxdWlyZWQgbW9kdWxlc1xuICAgICAgYXdhaXQgdGhpcy5yZWJ1aWxkUmVxdWlyZWRGaWxlcyhtb2R1bGVzLCBjb21waWxhdGlvbiwgZmlsZUVtaXR0ZXIpO1xuXG4gICAgICAvLyBDbGVhciBvdXQgdGhlIFdlYnBhY2sgY29tcGlsYXRpb24gdG8gYXZvaWQgYW4gZXh0cmEgcmV0YWluaW5nIHJlZmVyZW5jZVxuICAgICAgc3RhdGUucmVzb3VyY2VMb2FkZXI/LmNsZWFyUGFyZW50Q29tcGlsYXRpb24oKTtcblxuICAgICAgLy8gQW5hbHl6ZSBwcm9ncmFtIGZvciB1bnVzZWQgZmlsZXNcbiAgICAgIGlmIChjb21waWxhdGlvbi5lcnJvcnMubGVuZ3RoID4gMCkge1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG5cbiAgICAgIGZvciAoY29uc3Qgd2VicGFja01vZHVsZSBvZiBtb2R1bGVzKSB7XG4gICAgICAgIGNvbnN0IHJlc291cmNlID0gKHdlYnBhY2tNb2R1bGUgYXMgTm9ybWFsTW9kdWxlKS5yZXNvdXJjZTtcbiAgICAgICAgaWYgKHJlc291cmNlKSB7XG4gICAgICAgICAgdGhpcy5tYXJrUmVzb3VyY2VVc2VkKG5vcm1hbGl6ZVBhdGgocmVzb3VyY2UpLCBjdXJyZW50VW51c2VkKTtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBmb3IgKGNvbnN0IHVudXNlZCBvZiBjdXJyZW50VW51c2VkKSB7XG4gICAgICAgIGlmIChzdGF0ZS5wcmV2aW91c1VudXNlZD8uaGFzKHVudXNlZCkpIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICBhZGRXYXJuaW5nKFxuICAgICAgICAgIGNvbXBpbGF0aW9uLFxuICAgICAgICAgIGAke3VudXNlZH0gaXMgcGFydCBvZiB0aGUgVHlwZVNjcmlwdCBjb21waWxhdGlvbiBidXQgaXQncyB1bnVzZWQuXFxuYCArXG4gICAgICAgICAgICBgQWRkIG9ubHkgZW50cnkgcG9pbnRzIHRvIHRoZSAnZmlsZXMnIG9yICdpbmNsdWRlJyBwcm9wZXJ0aWVzIGluIHlvdXIgdHNjb25maWcuYCxcbiAgICAgICAgKTtcbiAgICAgIH1cbiAgICAgIHN0YXRlLnByZXZpb3VzVW51c2VkID0gY3VycmVudFVudXNlZDtcbiAgICB9KTtcblxuICAgIC8vIFN0b3JlIGZpbGUgZW1pdHRlciBmb3IgbG9hZGVyIHVzYWdlXG4gICAgZW1pdFJlZ2lzdHJhdGlvbi51cGRhdGUoZmlsZUVtaXR0ZXIpO1xuICB9XG5cbiAgcHJpdmF0ZSByZWdpc3RlcldpdGhDb21waWxhdGlvbihjb21waWxhdGlvbjogQ29tcGlsYXRpb24pIHtcbiAgICBsZXQgZmlsZUVtaXR0ZXJzID0gY29tcGlsYXRpb25GaWxlRW1pdHRlcnMuZ2V0KGNvbXBpbGF0aW9uKTtcbiAgICBpZiAoIWZpbGVFbWl0dGVycykge1xuICAgICAgZmlsZUVtaXR0ZXJzID0gbmV3IEZpbGVFbWl0dGVyQ29sbGVjdGlvbigpO1xuICAgICAgY29tcGlsYXRpb25GaWxlRW1pdHRlcnMuc2V0KGNvbXBpbGF0aW9uLCBmaWxlRW1pdHRlcnMpO1xuICAgICAgY29tcGlsYXRpb24uY29tcGlsZXIud2VicGFjay5Ob3JtYWxNb2R1bGUuZ2V0Q29tcGlsYXRpb25Ib29rcyhjb21waWxhdGlvbikubG9hZGVyLnRhcChcbiAgICAgICAgUExVR0lOX05BTUUsXG4gICAgICAgIChjb250ZXh0KSA9PiB7XG4gICAgICAgICAgY29uc3QgbG9hZGVyQ29udGV4dCA9IGNvbnRleHQgYXMgdHlwZW9mIGNvbnRleHQgJiB7XG4gICAgICAgICAgICBbQW5ndWxhclBsdWdpblN5bWJvbF0/OiBGaWxlRW1pdHRlckNvbGxlY3Rpb247XG4gICAgICAgICAgfTtcblxuICAgICAgICAgIGxvYWRlckNvbnRleHRbQW5ndWxhclBsdWdpblN5bWJvbF0gPSBmaWxlRW1pdHRlcnM7XG4gICAgICAgIH0sXG4gICAgICApO1xuICAgIH1cbiAgICBjb25zdCBlbWl0UmVnaXN0cmF0aW9uID0gZmlsZUVtaXR0ZXJzLnJlZ2lzdGVyKCk7XG5cbiAgICByZXR1cm4gZW1pdFJlZ2lzdHJhdGlvbjtcbiAgfVxuXG4gIHByaXZhdGUgbWFya1Jlc291cmNlVXNlZChub3JtYWxpemVkUmVzb3VyY2VQYXRoOiBzdHJpbmcsIGN1cnJlbnRVbnVzZWQ6IFNldDxzdHJpbmc+KTogdm9pZCB7XG4gICAgaWYgKCFjdXJyZW50VW51c2VkLmhhcyhub3JtYWxpemVkUmVzb3VyY2VQYXRoKSkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGN1cnJlbnRVbnVzZWQuZGVsZXRlKG5vcm1hbGl6ZWRSZXNvdXJjZVBhdGgpO1xuICAgIGNvbnN0IGRlcGVuZGVuY2llcyA9IHRoaXMuZmlsZURlcGVuZGVuY2llcy5nZXQobm9ybWFsaXplZFJlc291cmNlUGF0aCk7XG4gICAgaWYgKCFkZXBlbmRlbmNpZXMpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZm9yIChjb25zdCBkZXBlbmRlbmN5IG9mIGRlcGVuZGVuY2llcykge1xuICAgICAgdGhpcy5tYXJrUmVzb3VyY2VVc2VkKG5vcm1hbGl6ZVBhdGgoZGVwZW5kZW5jeSksIGN1cnJlbnRVbnVzZWQpO1xuICAgIH1cbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgcmVidWlsZFJlcXVpcmVkRmlsZXMoXG4gICAgbW9kdWxlczogSXRlcmFibGU8TW9kdWxlPixcbiAgICBjb21waWxhdGlvbjogQ29tcGlsYXRpb24sXG4gICAgZmlsZUVtaXR0ZXI6IEZpbGVFbWl0dGVyLFxuICApOiBQcm9taXNlPHZvaWQ+IHtcbiAgICBpZiAodGhpcy5yZXF1aXJlZEZpbGVzVG9FbWl0LnNpemUgPT09IDApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBmaWxlc1RvUmVidWlsZCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGZvciAoY29uc3QgcmVxdWlyZWRGaWxlIG9mIHRoaXMucmVxdWlyZWRGaWxlc1RvRW1pdCkge1xuICAgICAgY29uc3QgaGlzdG9yeSA9IGF3YWl0IHRoaXMuZ2V0RmlsZUVtaXRIaXN0b3J5KHJlcXVpcmVkRmlsZSk7XG4gICAgICBpZiAoaGlzdG9yeSkge1xuICAgICAgICBjb25zdCBlbWl0UmVzdWx0ID0gYXdhaXQgZmlsZUVtaXR0ZXIocmVxdWlyZWRGaWxlKTtcbiAgICAgICAgaWYgKFxuICAgICAgICAgIGVtaXRSZXN1bHQ/LmNvbnRlbnQgPT09IHVuZGVmaW5lZCB8fFxuICAgICAgICAgIGhpc3RvcnkubGVuZ3RoICE9PSBlbWl0UmVzdWx0LmNvbnRlbnQubGVuZ3RoIHx8XG4gICAgICAgICAgZW1pdFJlc3VsdC5oYXNoID09PSB1bmRlZmluZWQgfHxcbiAgICAgICAgICBCdWZmZXIuY29tcGFyZShoaXN0b3J5Lmhhc2gsIGVtaXRSZXN1bHQuaGFzaCkgIT09IDBcbiAgICAgICAgKSB7XG4gICAgICAgICAgLy8gTmV3IGVtaXQgcmVzdWx0IGlzIGRpZmZlcmVudCBzbyByZWJ1aWxkIHVzaW5nIG5ldyBlbWl0IHJlc3VsdFxuICAgICAgICAgIHRoaXMucmVxdWlyZWRGaWxlc1RvRW1pdENhY2hlLnNldChyZXF1aXJlZEZpbGUsIGVtaXRSZXN1bHQpO1xuICAgICAgICAgIGZpbGVzVG9SZWJ1aWxkLmFkZChyZXF1aXJlZEZpbGUpO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyBObyBlbWl0IGhpc3Rvcnkgc28gcmVidWlsZFxuICAgICAgICBmaWxlc1RvUmVidWlsZC5hZGQocmVxdWlyZWRGaWxlKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoZmlsZXNUb1JlYnVpbGQuc2l6ZSA+IDApIHtcbiAgICAgIGNvbnN0IHJlYnVpbGQgPSAod2VicGFja01vZHVsZTogTW9kdWxlKSA9PlxuICAgICAgICBuZXcgUHJvbWlzZTx2b2lkPigocmVzb2x2ZSkgPT4gY29tcGlsYXRpb24ucmVidWlsZE1vZHVsZSh3ZWJwYWNrTW9kdWxlLCAoKSA9PiByZXNvbHZlKCkpKTtcblxuICAgICAgY29uc3QgbW9kdWxlc1RvUmVidWlsZCA9IFtdO1xuICAgICAgZm9yIChjb25zdCB3ZWJwYWNrTW9kdWxlIG9mIG1vZHVsZXMpIHtcbiAgICAgICAgY29uc3QgcmVzb3VyY2UgPSAod2VicGFja01vZHVsZSBhcyBOb3JtYWxNb2R1bGUpLnJlc291cmNlO1xuICAgICAgICBpZiAocmVzb3VyY2UgJiYgZmlsZXNUb1JlYnVpbGQuaGFzKG5vcm1hbGl6ZVBhdGgocmVzb3VyY2UpKSkge1xuICAgICAgICAgIG1vZHVsZXNUb1JlYnVpbGQucHVzaCh3ZWJwYWNrTW9kdWxlKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgYXdhaXQgUHJvbWlzZS5hbGwobW9kdWxlc1RvUmVidWlsZC5tYXAoKHdlYnBhY2tNb2R1bGUpID0+IHJlYnVpbGQod2VicGFja01vZHVsZSkpKTtcbiAgICB9XG5cbiAgICB0aGlzLnJlcXVpcmVkRmlsZXNUb0VtaXQuY2xlYXIoKTtcbiAgICB0aGlzLnJlcXVpcmVkRmlsZXNUb0VtaXRDYWNoZS5jbGVhcigpO1xuICB9XG5cbiAgcHJpdmF0ZSBsb2FkQ29uZmlndXJhdGlvbigpIHtcbiAgICBjb25zdCB7XG4gICAgICBvcHRpb25zOiBjb21waWxlck9wdGlvbnMsXG4gICAgICByb290TmFtZXMsXG4gICAgICBlcnJvcnMsXG4gICAgfSA9IHRoaXMuY29tcGlsZXJDbGkucmVhZENvbmZpZ3VyYXRpb24oXG4gICAgICB0aGlzLnBsdWdpbk9wdGlvbnMudHNjb25maWcsXG4gICAgICB0aGlzLnBsdWdpbk9wdGlvbnMuY29tcGlsZXJPcHRpb25zLFxuICAgICk7XG4gICAgY29tcGlsZXJPcHRpb25zLm5vRW1pdE9uRXJyb3IgPSBmYWxzZTtcbiAgICBjb21waWxlck9wdGlvbnMuc3VwcHJlc3NPdXRwdXRQYXRoQ2hlY2sgPSB0cnVlO1xuICAgIGNvbXBpbGVyT3B0aW9ucy5vdXREaXIgPSB1bmRlZmluZWQ7XG4gICAgY29tcGlsZXJPcHRpb25zLmlubGluZVNvdXJjZXMgPSBjb21waWxlck9wdGlvbnMuc291cmNlTWFwO1xuICAgIGNvbXBpbGVyT3B0aW9ucy5pbmxpbmVTb3VyY2VNYXAgPSBmYWxzZTtcbiAgICBjb21waWxlck9wdGlvbnMubWFwUm9vdCA9IHVuZGVmaW5lZDtcbiAgICBjb21waWxlck9wdGlvbnMuc291cmNlUm9vdCA9IHVuZGVmaW5lZDtcbiAgICBjb21waWxlck9wdGlvbnMuYWxsb3dFbXB0eUNvZGVnZW5GaWxlcyA9IGZhbHNlO1xuICAgIGNvbXBpbGVyT3B0aW9ucy5hbm5vdGF0aW9uc0FzID0gJ2RlY29yYXRvcnMnO1xuICAgIGNvbXBpbGVyT3B0aW9ucy5lbmFibGVSZXNvdXJjZUlubGluaW5nID0gZmFsc2U7XG5cbiAgICByZXR1cm4geyBjb21waWxlck9wdGlvbnMsIHJvb3ROYW1lcywgZXJyb3JzIH07XG4gIH1cblxuICBwcml2YXRlIHVwZGF0ZUFvdFByb2dyYW0oXG4gICAgY29tcGlsZXJPcHRpb25zOiBDb21waWxlck9wdGlvbnMsXG4gICAgcm9vdE5hbWVzOiBzdHJpbmdbXSxcbiAgICBob3N0OiBDb21waWxlckhvc3QsXG4gICAgZGlhZ25vc3RpY3NSZXBvcnRlcjogRGlhZ25vc3RpY3NSZXBvcnRlcixcbiAgICByZXNvdXJjZUxvYWRlcjogV2VicGFja1Jlc291cmNlTG9hZGVyLFxuICApIHtcbiAgICAvLyBDcmVhdGUgdGhlIEFuZ3VsYXIgc3BlY2lmaWMgcHJvZ3JhbSB0aGF0IGNvbnRhaW5zIHRoZSBBbmd1bGFyIGNvbXBpbGVyXG4gICAgY29uc3QgYW5ndWxhclByb2dyYW0gPSBuZXcgdGhpcy5jb21waWxlckNsaS5OZ3RzY1Byb2dyYW0oXG4gICAgICByb290TmFtZXMsXG4gICAgICBjb21waWxlck9wdGlvbnMsXG4gICAgICBob3N0LFxuICAgICAgdGhpcy5uZ3RzY05leHRQcm9ncmFtLFxuICAgICk7XG4gICAgY29uc3QgYW5ndWxhckNvbXBpbGVyID0gYW5ndWxhclByb2dyYW0uY29tcGlsZXI7XG5cbiAgICAvLyBUaGUgYGlnbm9yZUZvckVtaXRgIHJldHVybiB2YWx1ZSBjYW4gYmUgc2FmZWx5IGlnbm9yZWQgd2hlbiBlbWl0dGluZy4gT25seSBmaWxlc1xuICAgIC8vIHRoYXQgd2lsbCBiZSBidW5kbGVkIChyZXF1ZXN0ZWQgYnkgV2VicGFjaykgd2lsbCBiZSBlbWl0dGVkLiBDb21iaW5lZCB3aXRoIFR5cGVTY3JpcHQnc1xuICAgIC8vIGVsaWRpbmcgb2YgdHlwZSBvbmx5IGltcG9ydHMsIHRoaXMgd2lsbCBjYXVzZSB0eXBlIG9ubHkgZmlsZXMgdG8gYmUgYXV0b21hdGljYWxseSBpZ25vcmVkLlxuICAgIC8vIEludGVybmFsIEFuZ3VsYXIgdHlwZSBjaGVjayBmaWxlcyBhcmUgYWxzbyBub3QgcmVzb2x2YWJsZSBieSB0aGUgYnVuZGxlci4gRXZlbiBpZiB0aGV5XG4gICAgLy8gd2VyZSBzb21laG93IGVycmFudGx5IGltcG9ydGVkLCB0aGUgYnVuZGxlciB3b3VsZCBlcnJvciBiZWZvcmUgYW4gZW1pdCB3YXMgYXR0ZW1wdGVkLlxuICAgIC8vIERpYWdub3N0aWNzIGFyZSBzdGlsbCBjb2xsZWN0ZWQgZm9yIGFsbCBmaWxlcyB3aGljaCByZXF1aXJlcyB1c2luZyBgaWdub3JlRm9yRGlhZ25vc3RpY3NgLlxuICAgIGNvbnN0IHsgaWdub3JlRm9yRGlhZ25vc3RpY3MsIGlnbm9yZUZvckVtaXQgfSA9IGFuZ3VsYXJDb21waWxlcjtcblxuICAgIC8vIFNvdXJjZUZpbGUgdmVyc2lvbnMgYXJlIHJlcXVpcmVkIGZvciBidWlsZGVyIHByb2dyYW1zLlxuICAgIC8vIFRoZSB3cmFwcGVkIGhvc3QgaW5zaWRlIE5ndHNjUHJvZ3JhbSBhZGRzIGFkZGl0aW9uYWwgZmlsZXMgdGhhdCB3aWxsIG5vdCBoYXZlIHZlcnNpb25zLlxuICAgIGNvbnN0IHR5cGVTY3JpcHRQcm9ncmFtID0gYW5ndWxhclByb2dyYW0uZ2V0VHNQcm9ncmFtKCk7XG4gICAgYXVnbWVudFByb2dyYW1XaXRoVmVyc2lvbmluZyh0eXBlU2NyaXB0UHJvZ3JhbSk7XG5cbiAgICBsZXQgYnVpbGRlcjogdHMuQnVpbGRlclByb2dyYW0gfCB0cy5FbWl0QW5kU2VtYW50aWNEaWFnbm9zdGljc0J1aWxkZXJQcm9ncmFtO1xuICAgIGlmICh0aGlzLndhdGNoTW9kZSkge1xuICAgICAgYnVpbGRlciA9IHRoaXMuYnVpbGRlciA9IHRzLmNyZWF0ZUVtaXRBbmRTZW1hbnRpY0RpYWdub3N0aWNzQnVpbGRlclByb2dyYW0oXG4gICAgICAgIHR5cGVTY3JpcHRQcm9ncmFtLFxuICAgICAgICBob3N0LFxuICAgICAgICB0aGlzLmJ1aWxkZXIsXG4gICAgICApO1xuICAgICAgdGhpcy5uZ3RzY05leHRQcm9ncmFtID0gYW5ndWxhclByb2dyYW07XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIFdoZW4gbm90IGluIHdhdGNoIG1vZGUsIHRoZSBzdGFydHVwIGNvc3Qgb2YgdGhlIGluY3JlbWVudGFsIGFuYWx5c2lzIGNhbiBiZSBhdm9pZGVkIGJ5XG4gICAgICAvLyB1c2luZyBhbiBhYnN0cmFjdCBidWlsZGVyIHRoYXQgb25seSB3cmFwcyBhIFR5cGVTY3JpcHQgcHJvZ3JhbS5cbiAgICAgIGJ1aWxkZXIgPSB0cy5jcmVhdGVBYnN0cmFjdEJ1aWxkZXIodHlwZVNjcmlwdFByb2dyYW0sIGhvc3QpO1xuICAgIH1cblxuICAgIC8vIFVwZGF0ZSBzZW1hbnRpYyBkaWFnbm9zdGljcyBjYWNoZVxuICAgIGNvbnN0IGFmZmVjdGVkRmlsZXMgPSBuZXcgU2V0PHRzLlNvdXJjZUZpbGU+KCk7XG5cbiAgICAvLyBBbmFseXplIGFmZmVjdGVkIGZpbGVzIHdoZW4gaW4gd2F0Y2ggbW9kZSBmb3IgaW5jcmVtZW50YWwgdHlwZSBjaGVja2luZ1xuICAgIGlmICgnZ2V0U2VtYW50aWNEaWFnbm9zdGljc09mTmV4dEFmZmVjdGVkRmlsZScgaW4gYnVpbGRlcikge1xuICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIG5vLWNvbnN0YW50LWNvbmRpdGlvblxuICAgICAgd2hpbGUgKHRydWUpIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gYnVpbGRlci5nZXRTZW1hbnRpY0RpYWdub3N0aWNzT2ZOZXh0QWZmZWN0ZWRGaWxlKHVuZGVmaW5lZCwgKHNvdXJjZUZpbGUpID0+IHtcbiAgICAgICAgICAvLyBJZiB0aGUgYWZmZWN0ZWQgZmlsZSBpcyBhIFRUQyBzaGltLCBhZGQgdGhlIHNoaW0ncyBvcmlnaW5hbCBzb3VyY2UgZmlsZS5cbiAgICAgICAgICAvLyBUaGlzIGVuc3VyZXMgdGhhdCBjaGFuZ2VzIHRoYXQgYWZmZWN0IFRUQyBhcmUgdHlwZWNoZWNrZWQgZXZlbiB3aGVuIHRoZSBjaGFuZ2VzXG4gICAgICAgICAgLy8gYXJlIG90aGVyd2lzZSB1bnJlbGF0ZWQgZnJvbSBhIFRTIHBlcnNwZWN0aXZlIGFuZCBkbyBub3QgcmVzdWx0IGluIEl2eSBjb2RlZ2VuIGNoYW5nZXMuXG4gICAgICAgICAgLy8gRm9yIGV4YW1wbGUsIGNoYW5naW5nIEBJbnB1dCBwcm9wZXJ0eSB0eXBlcyBvZiBhIGRpcmVjdGl2ZSB1c2VkIGluIGFub3RoZXIgY29tcG9uZW50J3NcbiAgICAgICAgICAvLyB0ZW1wbGF0ZS5cbiAgICAgICAgICBpZiAoXG4gICAgICAgICAgICBpZ25vcmVGb3JEaWFnbm9zdGljcy5oYXMoc291cmNlRmlsZSkgJiZcbiAgICAgICAgICAgIHNvdXJjZUZpbGUuZmlsZU5hbWUuZW5kc1dpdGgoJy5uZ3R5cGVjaGVjay50cycpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICAvLyBUaGlzIGZpbGUgbmFtZSBjb252ZXJzaW9uIHJlbGllcyBvbiBpbnRlcm5hbCBjb21waWxlciBsb2dpYyBhbmQgc2hvdWxkIGJlIGNvbnZlcnRlZFxuICAgICAgICAgICAgLy8gdG8gYW4gb2ZmaWNpYWwgbWV0aG9kIHdoZW4gYXZhaWxhYmxlLiAxNSBpcyBsZW5ndGggb2YgYC5uZ3R5cGVjaGVjay50c2BcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsRmlsZW5hbWUgPSBzb3VyY2VGaWxlLmZpbGVOYW1lLnNsaWNlKDAsIC0xNSkgKyAnLnRzJztcbiAgICAgICAgICAgIGNvbnN0IG9yaWdpbmFsU291cmNlRmlsZSA9IGJ1aWxkZXIuZ2V0U291cmNlRmlsZShvcmlnaW5hbEZpbGVuYW1lKTtcbiAgICAgICAgICAgIGlmIChvcmlnaW5hbFNvdXJjZUZpbGUpIHtcbiAgICAgICAgICAgICAgYWZmZWN0ZWRGaWxlcy5hZGQob3JpZ2luYWxTb3VyY2VGaWxlKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9KTtcblxuICAgICAgICBpZiAoIXJlc3VsdCkge1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG5cbiAgICAgICAgYWZmZWN0ZWRGaWxlcy5hZGQocmVzdWx0LmFmZmVjdGVkIGFzIHRzLlNvdXJjZUZpbGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENvbGxlY3QgcHJvZ3JhbSBsZXZlbCBkaWFnbm9zdGljc1xuICAgIGNvbnN0IGRpYWdub3N0aWNzID0gW1xuICAgICAgLi4uYW5ndWxhckNvbXBpbGVyLmdldE9wdGlvbkRpYWdub3N0aWNzKCksXG4gICAgICAuLi5idWlsZGVyLmdldE9wdGlvbnNEaWFnbm9zdGljcygpLFxuICAgICAgLi4uYnVpbGRlci5nZXRHbG9iYWxEaWFnbm9zdGljcygpLFxuICAgIF07XG4gICAgZGlhZ25vc3RpY3NSZXBvcnRlcihkaWFnbm9zdGljcyk7XG5cbiAgICAvLyBDb2xsZWN0IHNvdXJjZSBmaWxlIHNwZWNpZmljIGRpYWdub3N0aWNzXG4gICAgZm9yIChjb25zdCBzb3VyY2VGaWxlIG9mIGJ1aWxkZXIuZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgaWYgKCFpZ25vcmVGb3JEaWFnbm9zdGljcy5oYXMoc291cmNlRmlsZSkpIHtcbiAgICAgICAgZGlhZ25vc3RpY3NSZXBvcnRlcihidWlsZGVyLmdldFN5bnRhY3RpY0RpYWdub3N0aWNzKHNvdXJjZUZpbGUpKTtcbiAgICAgICAgZGlhZ25vc3RpY3NSZXBvcnRlcihidWlsZGVyLmdldFNlbWFudGljRGlhZ25vc3RpY3Moc291cmNlRmlsZSkpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHRyYW5zZm9ybWVycyA9IGNyZWF0ZUFvdFRyYW5zZm9ybWVycyhidWlsZGVyLCB0aGlzLnBsdWdpbk9wdGlvbnMpO1xuXG4gICAgY29uc3QgZ2V0RGVwZW5kZW5jaWVzID0gKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpID0+IHtcbiAgICAgIGNvbnN0IGRlcGVuZGVuY2llcyA9IFtdO1xuICAgICAgZm9yIChjb25zdCByZXNvdXJjZVBhdGggb2YgYW5ndWxhckNvbXBpbGVyLmdldFJlc291cmNlRGVwZW5kZW5jaWVzKHNvdXJjZUZpbGUpKSB7XG4gICAgICAgIGRlcGVuZGVuY2llcy5wdXNoKFxuICAgICAgICAgIHJlc291cmNlUGF0aCxcbiAgICAgICAgICAvLyBSZXRyaWV2ZSBhbGwgZGVwZW5kZW5jaWVzIG9mIHRoZSByZXNvdXJjZSAoc3R5bGVzaGVldCBpbXBvcnRzLCBldGMuKVxuICAgICAgICAgIC4uLnJlc291cmNlTG9hZGVyLmdldFJlc291cmNlRGVwZW5kZW5jaWVzKHJlc291cmNlUGF0aCksXG4gICAgICAgICk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBkZXBlbmRlbmNpZXM7XG4gICAgfTtcblxuICAgIC8vIFJlcXVpcmVkIHRvIHN1cHBvcnQgYXN5bmNocm9ub3VzIHJlc291cmNlIGxvYWRpbmdcbiAgICAvLyBNdXN0IGJlIGRvbmUgYmVmb3JlIGNyZWF0aW5nIHRyYW5zZm9ybWVycyBvciBnZXR0aW5nIHRlbXBsYXRlIGRpYWdub3N0aWNzXG4gICAgY29uc3QgcGVuZGluZ0FuYWx5c2lzID0gYW5ndWxhckNvbXBpbGVyXG4gICAgICAuYW5hbHl6ZUFzeW5jKClcbiAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgdGhpcy5yZXF1aXJlZEZpbGVzVG9FbWl0LmNsZWFyKCk7XG5cbiAgICAgICAgZm9yIChjb25zdCBzb3VyY2VGaWxlIG9mIGJ1aWxkZXIuZ2V0U291cmNlRmlsZXMoKSkge1xuICAgICAgICAgIGlmIChzb3VyY2VGaWxlLmlzRGVjbGFyYXRpb25GaWxlKSB7XG4gICAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBDb2xsZWN0IHNvdXJjZXMgdGhhdCBhcmUgcmVxdWlyZWQgdG8gYmUgZW1pdHRlZFxuICAgICAgICAgIGlmIChcbiAgICAgICAgICAgICFpZ25vcmVGb3JFbWl0Lmhhcyhzb3VyY2VGaWxlKSAmJlxuICAgICAgICAgICAgIWFuZ3VsYXJDb21waWxlci5pbmNyZW1lbnRhbENvbXBpbGF0aW9uLnNhZmVUb1NraXBFbWl0KHNvdXJjZUZpbGUpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICB0aGlzLnJlcXVpcmVkRmlsZXNUb0VtaXQuYWRkKG5vcm1hbGl6ZVBhdGgoc291cmNlRmlsZS5maWxlTmFtZSkpO1xuXG4gICAgICAgICAgICAvLyBJZiByZXF1aXJlZCB0byBlbWl0LCBkaWFnbm9zdGljcyBtYXkgaGF2ZSBhbHNvIGNoYW5nZWRcbiAgICAgICAgICAgIGlmICghaWdub3JlRm9yRGlhZ25vc3RpY3MuaGFzKHNvdXJjZUZpbGUpKSB7XG4gICAgICAgICAgICAgIGFmZmVjdGVkRmlsZXMuYWRkKHNvdXJjZUZpbGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSBpZiAoXG4gICAgICAgICAgICB0aGlzLnNvdXJjZUZpbGVDYWNoZSAmJlxuICAgICAgICAgICAgIWFmZmVjdGVkRmlsZXMuaGFzKHNvdXJjZUZpbGUpICYmXG4gICAgICAgICAgICAhaWdub3JlRm9yRGlhZ25vc3RpY3MuaGFzKHNvdXJjZUZpbGUpXG4gICAgICAgICAgKSB7XG4gICAgICAgICAgICAvLyBVc2UgY2FjaGVkIEFuZ3VsYXIgZGlhZ25vc3RpY3MgZm9yIHVuY2hhbmdlZCBhbmQgdW5hZmZlY3RlZCBmaWxlc1xuICAgICAgICAgICAgY29uc3QgYW5ndWxhckRpYWdub3N0aWNzID0gdGhpcy5zb3VyY2VGaWxlQ2FjaGUuZ2V0QW5ndWxhckRpYWdub3N0aWNzKHNvdXJjZUZpbGUpO1xuICAgICAgICAgICAgaWYgKGFuZ3VsYXJEaWFnbm9zdGljcykge1xuICAgICAgICAgICAgICBkaWFnbm9zdGljc1JlcG9ydGVyKGFuZ3VsYXJEaWFnbm9zdGljcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQ29sbGVjdCBuZXcgQW5ndWxhciBkaWFnbm9zdGljcyBmb3IgZmlsZXMgYWZmZWN0ZWQgYnkgY2hhbmdlc1xuICAgICAgICBjb25zdCBPcHRpbWl6ZUZvciA9IHRoaXMuY29tcGlsZXJDbGkuT3B0aW1pemVGb3I7XG4gICAgICAgIGNvbnN0IG9wdGltaXplRGlhZ25vc3RpY3NGb3IgPVxuICAgICAgICAgIGFmZmVjdGVkRmlsZXMuc2l6ZSA8PSBESUFHTk9TVElDU19BRkZFQ1RFRF9USFJFU0hPTERcbiAgICAgICAgICAgID8gT3B0aW1pemVGb3IuU2luZ2xlRmlsZVxuICAgICAgICAgICAgOiBPcHRpbWl6ZUZvci5XaG9sZVByb2dyYW07XG4gICAgICAgIGZvciAoY29uc3QgYWZmZWN0ZWRGaWxlIG9mIGFmZmVjdGVkRmlsZXMpIHtcbiAgICAgICAgICBjb25zdCBhbmd1bGFyRGlhZ25vc3RpY3MgPSBhbmd1bGFyQ29tcGlsZXIuZ2V0RGlhZ25vc3RpY3NGb3JGaWxlKFxuICAgICAgICAgICAgYWZmZWN0ZWRGaWxlLFxuICAgICAgICAgICAgb3B0aW1pemVEaWFnbm9zdGljc0ZvcixcbiAgICAgICAgICApO1xuICAgICAgICAgIGRpYWdub3N0aWNzUmVwb3J0ZXIoYW5ndWxhckRpYWdub3N0aWNzKTtcbiAgICAgICAgICB0aGlzLnNvdXJjZUZpbGVDYWNoZT8udXBkYXRlQW5ndWxhckRpYWdub3N0aWNzKGFmZmVjdGVkRmlsZSwgYW5ndWxhckRpYWdub3N0aWNzKTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgZW1pdHRlcjogdGhpcy5jcmVhdGVGaWxlRW1pdHRlcihcbiAgICAgICAgICAgIGJ1aWxkZXIsXG4gICAgICAgICAgICBtZXJnZVRyYW5zZm9ybWVycyhhbmd1bGFyQ29tcGlsZXIucHJlcGFyZUVtaXQoKS50cmFuc2Zvcm1lcnMsIHRyYW5zZm9ybWVycyksXG4gICAgICAgICAgICBnZXREZXBlbmRlbmNpZXMsXG4gICAgICAgICAgICAoc291cmNlRmlsZSkgPT4ge1xuICAgICAgICAgICAgICB0aGlzLnJlcXVpcmVkRmlsZXNUb0VtaXQuZGVsZXRlKG5vcm1hbGl6ZVBhdGgoc291cmNlRmlsZS5maWxlTmFtZSkpO1xuICAgICAgICAgICAgICBhbmd1bGFyQ29tcGlsZXIuaW5jcmVtZW50YWxDb21waWxhdGlvbi5yZWNvcmRTdWNjZXNzZnVsRW1pdChzb3VyY2VGaWxlKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgKSxcbiAgICAgICAgfTtcbiAgICAgIH0pXG4gICAgICAuY2F0Y2goKGVycikgPT4gKHsgZXJyb3JNZXNzYWdlOiBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogYCR7ZXJyfWAgfSkpO1xuXG4gICAgY29uc3QgYW5hbHl6aW5nRmlsZUVtaXR0ZXI6IEZpbGVFbWl0dGVyID0gYXN5bmMgKGZpbGUpID0+IHtcbiAgICAgIGNvbnN0IGFuYWx5c2lzID0gYXdhaXQgcGVuZGluZ0FuYWx5c2lzO1xuXG4gICAgICBpZiAoJ2Vycm9yTWVzc2FnZScgaW4gYW5hbHlzaXMpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGFuYWx5c2lzLmVycm9yTWVzc2FnZSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBhbmFseXNpcy5lbWl0dGVyKGZpbGUpO1xuICAgIH07XG5cbiAgICByZXR1cm4ge1xuICAgICAgZmlsZUVtaXR0ZXI6IGFuYWx5emluZ0ZpbGVFbWl0dGVyLFxuICAgICAgYnVpbGRlcixcbiAgICAgIGludGVybmFsRmlsZXM6IGlnbm9yZUZvckVtaXQsXG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgdXBkYXRlSml0UHJvZ3JhbShcbiAgICBjb21waWxlck9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucyxcbiAgICByb290TmFtZXM6IHJlYWRvbmx5IHN0cmluZ1tdLFxuICAgIGhvc3Q6IENvbXBpbGVySG9zdCxcbiAgICBkaWFnbm9zdGljc1JlcG9ydGVyOiBEaWFnbm9zdGljc1JlcG9ydGVyLFxuICApIHtcbiAgICBsZXQgYnVpbGRlcjtcbiAgICBpZiAodGhpcy53YXRjaE1vZGUpIHtcbiAgICAgIGJ1aWxkZXIgPSB0aGlzLmJ1aWxkZXIgPSB0cy5jcmVhdGVFbWl0QW5kU2VtYW50aWNEaWFnbm9zdGljc0J1aWxkZXJQcm9ncmFtKFxuICAgICAgICByb290TmFtZXMsXG4gICAgICAgIGNvbXBpbGVyT3B0aW9ucyxcbiAgICAgICAgaG9zdCxcbiAgICAgICAgdGhpcy5idWlsZGVyLFxuICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gV2hlbiBub3QgaW4gd2F0Y2ggbW9kZSwgdGhlIHN0YXJ0dXAgY29zdCBvZiB0aGUgaW5jcmVtZW50YWwgYW5hbHlzaXMgY2FuIGJlIGF2b2lkZWQgYnlcbiAgICAgIC8vIHVzaW5nIGFuIGFic3RyYWN0IGJ1aWxkZXIgdGhhdCBvbmx5IHdyYXBzIGEgVHlwZVNjcmlwdCBwcm9ncmFtLlxuICAgICAgYnVpbGRlciA9IHRzLmNyZWF0ZUFic3RyYWN0QnVpbGRlcihyb290TmFtZXMsIGNvbXBpbGVyT3B0aW9ucywgaG9zdCk7XG4gICAgfVxuXG4gICAgY29uc3QgZGlhZ25vc3RpY3MgPSBbXG4gICAgICAuLi5idWlsZGVyLmdldE9wdGlvbnNEaWFnbm9zdGljcygpLFxuICAgICAgLi4uYnVpbGRlci5nZXRHbG9iYWxEaWFnbm9zdGljcygpLFxuICAgICAgLi4uYnVpbGRlci5nZXRTeW50YWN0aWNEaWFnbm9zdGljcygpLFxuICAgICAgLy8gR2F0aGVyIGluY3JlbWVudGFsIHNlbWFudGljIGRpYWdub3N0aWNzXG4gICAgICAuLi5idWlsZGVyLmdldFNlbWFudGljRGlhZ25vc3RpY3MoKSxcbiAgICBdO1xuICAgIGRpYWdub3N0aWNzUmVwb3J0ZXIoZGlhZ25vc3RpY3MpO1xuXG4gICAgY29uc3QgdHJhbnNmb3JtZXJzID0gY3JlYXRlSml0VHJhbnNmb3JtZXJzKGJ1aWxkZXIsIHRoaXMuY29tcGlsZXJDbGksIHRoaXMucGx1Z2luT3B0aW9ucyk7XG5cbiAgICByZXR1cm4ge1xuICAgICAgZmlsZUVtaXR0ZXI6IHRoaXMuY3JlYXRlRmlsZUVtaXR0ZXIoYnVpbGRlciwgdHJhbnNmb3JtZXJzLCAoKSA9PiBbXSksXG4gICAgICBidWlsZGVyLFxuICAgICAgaW50ZXJuYWxGaWxlczogdW5kZWZpbmVkLFxuICAgIH07XG4gIH1cblxuICBwcml2YXRlIGNyZWF0ZUZpbGVFbWl0dGVyKFxuICAgIHByb2dyYW06IHRzLkJ1aWxkZXJQcm9ncmFtLFxuICAgIHRyYW5zZm9ybWVyczogdHMuQ3VzdG9tVHJhbnNmb3JtZXJzID0ge30sXG4gICAgZ2V0RXh0cmFEZXBlbmRlbmNpZXM6IChzb3VyY2VGaWxlOiB0cy5Tb3VyY2VGaWxlKSA9PiBJdGVyYWJsZTxzdHJpbmc+LFxuICAgIG9uQWZ0ZXJFbWl0PzogKHNvdXJjZUZpbGU6IHRzLlNvdXJjZUZpbGUpID0+IHZvaWQsXG4gICk6IEZpbGVFbWl0dGVyIHtcbiAgICByZXR1cm4gYXN5bmMgKGZpbGU6IHN0cmluZykgPT4ge1xuICAgICAgY29uc3QgZmlsZVBhdGggPSBub3JtYWxpemVQYXRoKGZpbGUpO1xuICAgICAgaWYgKHRoaXMucmVxdWlyZWRGaWxlc1RvRW1pdENhY2hlLmhhcyhmaWxlUGF0aCkpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMucmVxdWlyZWRGaWxlc1RvRW1pdENhY2hlLmdldChmaWxlUGF0aCk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHNvdXJjZUZpbGUgPSBwcm9ncmFtLmdldFNvdXJjZUZpbGUoZmlsZVBhdGgpO1xuICAgICAgaWYgKCFzb3VyY2VGaWxlKSB7XG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICB9XG5cbiAgICAgIGxldCBjb250ZW50OiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICBsZXQgbWFwOiBzdHJpbmcgfCB1bmRlZmluZWQ7XG4gICAgICBwcm9ncmFtLmVtaXQoXG4gICAgICAgIHNvdXJjZUZpbGUsXG4gICAgICAgIChmaWxlbmFtZSwgZGF0YSkgPT4ge1xuICAgICAgICAgIGlmIChmaWxlbmFtZS5lbmRzV2l0aCgnLm1hcCcpKSB7XG4gICAgICAgICAgICBtYXAgPSBkYXRhO1xuICAgICAgICAgIH0gZWxzZSBpZiAoZmlsZW5hbWUuZW5kc1dpdGgoJy5qcycpKSB7XG4gICAgICAgICAgICBjb250ZW50ID0gZGF0YTtcbiAgICAgICAgICB9XG4gICAgICAgIH0sXG4gICAgICAgIHVuZGVmaW5lZCxcbiAgICAgICAgdW5kZWZpbmVkLFxuICAgICAgICB0cmFuc2Zvcm1lcnMsXG4gICAgICApO1xuXG4gICAgICBvbkFmdGVyRW1pdD8uKHNvdXJjZUZpbGUpO1xuXG4gICAgICAvLyBDYXB0dXJlIGVtaXQgaGlzdG9yeSBpbmZvIGZvciBBbmd1bGFyIHJlYnVpbGQgYW5hbHlzaXNcbiAgICAgIGNvbnN0IGhhc2ggPSBjb250ZW50ID8gKGF3YWl0IHRoaXMuYWRkRmlsZUVtaXRIaXN0b3J5KGZpbGVQYXRoLCBjb250ZW50KSkuaGFzaCA6IHVuZGVmaW5lZDtcblxuICAgICAgY29uc3QgZGVwZW5kZW5jaWVzID0gW1xuICAgICAgICAuLi4odGhpcy5maWxlRGVwZW5kZW5jaWVzLmdldChmaWxlUGF0aCkgfHwgW10pLFxuICAgICAgICAuLi5nZXRFeHRyYURlcGVuZGVuY2llcyhzb3VyY2VGaWxlKSxcbiAgICAgIF0ubWFwKGV4dGVybmFsaXplUGF0aCk7XG5cbiAgICAgIHJldHVybiB7IGNvbnRlbnQsIG1hcCwgZGVwZW5kZW5jaWVzLCBoYXNoIH07XG4gICAgfTtcbiAgfVxuXG4gIHByaXZhdGUgYXN5bmMgaW5pdGlhbGl6ZUNvbXBpbGVyQ2xpKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIGlmICh0aGlzLmNvbXBpbGVyQ2xpTW9kdWxlKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8gVGhpcyB1c2VzIGEgZHluYW1pYyBpbXBvcnQgdG8gbG9hZCBgQGFuZ3VsYXIvY29tcGlsZXItY2xpYCB3aGljaCBtYXkgYmUgRVNNLlxuICAgIC8vIENvbW1vbkpTIGNvZGUgY2FuIGxvYWQgRVNNIGNvZGUgdmlhIGEgZHluYW1pYyBpbXBvcnQuIFVuZm9ydHVuYXRlbHksIFR5cGVTY3JpcHRcbiAgICAvLyB3aWxsIGN1cnJlbnRseSwgdW5jb25kaXRpb25hbGx5IGRvd25sZXZlbCBkeW5hbWljIGltcG9ydCBpbnRvIGEgcmVxdWlyZSBjYWxsLlxuICAgIC8vIHJlcXVpcmUgY2FsbHMgY2Fubm90IGxvYWQgRVNNIGNvZGUgYW5kIHdpbGwgcmVzdWx0IGluIGEgcnVudGltZSBlcnJvci4gVG8gd29ya2Fyb3VuZFxuICAgIC8vIHRoaXMsIGEgRnVuY3Rpb24gY29uc3RydWN0b3IgaXMgdXNlZCB0byBwcmV2ZW50IFR5cGVTY3JpcHQgZnJvbSBjaGFuZ2luZyB0aGUgZHluYW1pYyBpbXBvcnQuXG4gICAgLy8gT25jZSBUeXBlU2NyaXB0IHByb3ZpZGVzIHN1cHBvcnQgZm9yIGtlZXBpbmcgdGhlIGR5bmFtaWMgaW1wb3J0IHRoaXMgd29ya2Fyb3VuZCBjYW5cbiAgICAvLyBiZSBkcm9wcGVkLlxuICAgIHRoaXMuY29tcGlsZXJDbGlNb2R1bGUgPSBhd2FpdCBuZXcgRnVuY3Rpb24oYHJldHVybiBpbXBvcnQoJ0Bhbmd1bGFyL2NvbXBpbGVyLWNsaScpO2ApKCk7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGFkZEZpbGVFbWl0SGlzdG9yeShcbiAgICBmaWxlUGF0aDogc3RyaW5nLFxuICAgIGNvbnRlbnQ6IHN0cmluZyxcbiAgKTogUHJvbWlzZTxGaWxlRW1pdEhpc3RvcnlJdGVtPiB7XG4gICAgYXNzZXJ0Lm9rKHRoaXMud2VicGFja0NyZWF0ZUhhc2gsICdGaWxlIGVtaXR0ZXIgaXMgdXNlZCBwcmlvciB0byBXZWJwYWNrIGNvbXBpbGF0aW9uJyk7XG5cbiAgICBjb25zdCBoaXN0b3J5RGF0YTogRmlsZUVtaXRIaXN0b3J5SXRlbSA9IHtcbiAgICAgIGxlbmd0aDogY29udGVudC5sZW5ndGgsXG4gICAgICBoYXNoOiB0aGlzLndlYnBhY2tDcmVhdGVIYXNoKCd4eGhhc2g2NCcpLnVwZGF0ZShjb250ZW50KS5kaWdlc3QoKSBhcyBVaW50OEFycmF5LFxuICAgIH07XG5cbiAgICBpZiAodGhpcy53ZWJwYWNrQ2FjaGUpIHtcbiAgICAgIGNvbnN0IGhpc3RvcnkgPSBhd2FpdCB0aGlzLmdldEZpbGVFbWl0SGlzdG9yeShmaWxlUGF0aCk7XG4gICAgICBpZiAoIWhpc3RvcnkgfHwgQnVmZmVyLmNvbXBhcmUoaGlzdG9yeS5oYXNoLCBoaXN0b3J5RGF0YS5oYXNoKSAhPT0gMCkge1xuICAgICAgICAvLyBIYXNoIGRvZXNuJ3QgbWF0Y2ggb3IgaXRlbSBkb2Vzbid0IGV4aXN0LlxuICAgICAgICBhd2FpdCB0aGlzLndlYnBhY2tDYWNoZS5zdG9yZVByb21pc2UoZmlsZVBhdGgsIG51bGwsIGhpc3RvcnlEYXRhKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHRoaXMud2F0Y2hNb2RlKSB7XG4gICAgICAvLyBUaGUgaW4gbWVtb3J5IGZpbGUgZW1pdCBoaXN0b3J5IGlzIG9ubHkgcmVxdWlyZWQgZHVyaW5nIHdhdGNoIG1vZGUuXG4gICAgICB0aGlzLmZpbGVFbWl0SGlzdG9yeS5zZXQoZmlsZVBhdGgsIGhpc3RvcnlEYXRhKTtcbiAgICB9XG5cbiAgICByZXR1cm4gaGlzdG9yeURhdGE7XG4gIH1cblxuICBwcml2YXRlIGFzeW5jIGdldEZpbGVFbWl0SGlzdG9yeShmaWxlUGF0aDogc3RyaW5nKTogUHJvbWlzZTxGaWxlRW1pdEhpc3RvcnlJdGVtIHwgdW5kZWZpbmVkPiB7XG4gICAgcmV0dXJuIHRoaXMud2VicGFja0NhY2hlXG4gICAgICA/IHRoaXMud2VicGFja0NhY2hlLmdldFByb21pc2U8RmlsZUVtaXRIaXN0b3J5SXRlbSB8IHVuZGVmaW5lZD4oZmlsZVBhdGgsIG51bGwpXG4gICAgICA6IHRoaXMuZmlsZUVtaXRIaXN0b3J5LmdldChmaWxlUGF0aCk7XG4gIH1cbn1cbiJdfQ==