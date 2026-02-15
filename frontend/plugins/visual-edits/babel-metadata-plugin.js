// babel-metadata-plugin.js
// Babel plugin for JSX transformation - adds metadata to all elements
const path = require("path");
const fs = require("fs");

// ───────────────────────────────────────────────────────────────────────────────
// ===== Dynamic composite detection (auto-exclude) =====
const EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];
const PROJECT_ROOT = path.resolve(__dirname, '../..'); // frontend root (../../ from plugins/visual-edits/)
const SRC_ALIAS = path.resolve(PROJECT_ROOT, "src");

const RESOLVE_CACHE = new Map(); // key: fromFile::source -> absPath | null
const FILE_AST_CACHE = new Map(); // absPath -> { ast, mtimeMs }
const PORTAL_COMP_CACHE = new Map(); // key: absPath::exportName -> boolean
const DYNAMIC_COMP_CACHE = new Map(); // key: absPath::exportName -> boolean
const BINDING_DYNAMIC_CACHE = new WeakMap(); // node -> boolean

// Cache for cross-file prop source tracking
// Key: "absoluteFilePath::ComponentName::propName"
// Value: { sourceInfo, arrayContext, fromFile }
const PROP_SOURCE_CACHE = new Map();

function resolveImportPath(source, fromFile) {
  const cacheKey = `${fromFile}::${source}`;
  if (RESOLVE_CACHE.has(cacheKey)) return RESOLVE_CACHE.get(cacheKey);

  let base;
  if (source.startsWith("@/")) {
    base = path.join(SRC_ALIAS, source.slice(2));
  } else if (source.startsWith("./") || source.startsWith("../")) {
    base = path.resolve(path.dirname(fromFile), source);
  } else {
    // bare specifier (node_modules) — skip analysis
    RESOLVE_CACHE.set(cacheKey, null);
    return null;
  }

  // try direct file
  for (const ext of EXTENSIONS) {
    const file = base.endsWith(ext) ? base : base + ext;
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      RESOLVE_CACHE.set(cacheKey, file);
      return file;
    }
  }
  // try index.* in directory
  if (fs.existsSync(base) && fs.statSync(base).isDirectory()) {
    for (const ext of EXTENSIONS) {
      const idx = path.join(base, "index" + ext);
      if (fs.existsSync(idx)) {
        RESOLVE_CACHE.set(cacheKey, idx);
        return idx;
      }
    }
  }

  RESOLVE_CACHE.set(cacheKey, null);
  return null;
}

/**
 * Gets the absolute path of an imported component's source file.
 * Returns null if the component is defined in the same file.
 */
function getComponentSourcePath(binding, state) {
  if (!binding || !binding.path) return null;

  const bindingPath = binding.path;
  const fileFrom = state.filename || state.file?.opts?.filename || __filename;

  if (bindingPath.isImportSpecifier()) {
    const from = bindingPath.parent.source.value;
    return resolveImportPath(from, fileFrom);
  }

  if (bindingPath.isImportDefaultSpecifier()) {
    const from = bindingPath.parent.source.value;
    return resolveImportPath(from, fileFrom);
  }

  return null; // Same-file binding
}

function parseFileAst(absPath, parser) {
  try {
    const stat = fs.statSync(absPath);
    const cached = FILE_AST_CACHE.get(absPath);
    if (cached && cached.mtimeMs === stat.mtimeMs) return cached.ast;

    const code = fs.readFileSync(absPath, "utf8");
    const ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
    });
    FILE_AST_CACHE.set(absPath, { ast, mtimeMs: stat.mtimeMs });
    return ast;
  } catch (error) {
    return null;
  }
}

function jsxNameOf(openingEl, t) {
  const n = openingEl?.name;
  if (t.isJSXIdentifier(n)) return n.name;
  if (t.isJSXMemberExpression(n)) return n.property.name; // <X.Y>
  return null;
}

const PORTAL_SUFFIX_RE =
  /(Trigger|Portal|Content|Overlay|Viewport|Anchor|Arrow)$/;

function isPortalishName(name, RADIX_ROOTS) {
  if (!name) return false;
  return RADIX_ROOTS.has(name) || PORTAL_SUFFIX_RE.test(name);
}

const isStaticLiteralExpression = (expr, t) =>
  t.isStringLiteral(expr) ||
  t.isNumericLiteral(expr) ||
  t.isBooleanLiteral(expr) ||
  t.isNullLiteral(expr) ||
  (t.isTemplateLiteral(expr) && expr.expressions.length === 0);

const buildDynamicExpressionWrapper = (child, t) =>
  t.jsxElement(
    t.jsxOpeningElement(
      t.jsxIdentifier("span"),
      [
        t.jsxAttribute(
          t.jsxIdentifier("data-ve-dynamic"),
          t.stringLiteral("true"),
        ),
        t.jsxAttribute(
          t.jsxIdentifier("x-excluded"),
          t.stringLiteral("true"),
        ),
        t.jsxAttribute(
          t.jsxIdentifier("style"),
          t.jsxExpressionContainer(
            t.objectExpression([
              t.objectProperty(
                t.identifier("display"),
                t.stringLiteral("contents"),
              ),
            ]),
          ),
        ),
      ],
      false,
    ),
    t.jsxClosingElement(t.jsxIdentifier("span")),
    [child],
    false,
  );

const wrapDynamicExpressionChildren = (jsxPath, t) => {
  const children = jsxPath.node.children || [];
  let didChange = false;

  const nextChildren = children.map((child) => {
    if (
      t.isJSXExpressionContainer(child) &&
      !t.isJSXEmptyExpression(child.expression) &&
      !isStaticLiteralExpression(child.expression, t)
    ) {
      didChange = true;
      return buildDynamicExpressionWrapper(child, t);
    }
    return child;
  });

  if (didChange) {
    jsxPath.node.children = nextChildren;
  }
};

// Analyze a specific exported component in a file
function fileExportHasPortals({
  absPath,
  exportName, // string or "default"
  t,
  traverse,
  parser,
  RADIX_ROOTS,
  depth = 0,
  maxDepth = 3,
}) {
  if (!absPath || depth > maxDepth) return false;
  const cacheKey = `${absPath}::${exportName}`;
  if (PORTAL_COMP_CACHE.has(cacheKey)) return PORTAL_COMP_CACHE.get(cacheKey);

  const ast = parseFileAst(absPath, parser);
  if (!ast) {
    PORTAL_COMP_CACHE.set(cacheKey, false);
    return false;
  }

  // Map local imports -> file paths for recursive checks
  const importMap = new Map(); // localName -> { absPath, importName }
  traverse(ast, {
    ImportDeclaration(p) {
      const src = p.node.source.value;
      const target = resolveImportPath(src, absPath);
      if (!target) return;
      p.node.specifiers.forEach((s) => {
        if (t.isImportSpecifier(s)) {
          importMap.set(s.local.name, {
            absPath: target,
            importName: s.imported.name,
          });
        } else if (t.isImportDefaultSpecifier(s)) {
          importMap.set(s.local.name, {
            absPath: target,
            importName: "default",
          });
        }
      });
    },
  });

  // Find the component declaration for exportName
  let compPaths = [];

  traverse(ast, {
    ExportDefaultDeclaration(p) {
      if (exportName !== "default") return;
      const decl = p.node.declaration;
      if (
        t.isFunctionDeclaration(decl) ||
        t.isArrowFunctionExpression(decl) ||
        t.isFunctionExpression(decl)
      ) {
        compPaths.push(p.get("declaration"));
      } else if (t.isIdentifier(decl)) {
        const bind = p.scope.getBinding(decl.name);
        if (bind) compPaths.push(bind.path);
      }
    },
    ExportNamedDeclaration(p) {
      if (exportName === "default") return;
      if (p.node.declaration) {
        const d = p.node.declaration;
        if (t.isFunctionDeclaration(d) && d.id?.name === exportName) {
          compPaths.push(p.get("declaration"));
        }
        if (t.isVariableDeclaration(d)) {
          d.declarations.forEach((vd, i) => {
            if (t.isIdentifier(vd.id) && vd.id.name === exportName) {
              compPaths.push(p.get(`declaration.declarations.${i}.init`));
            }
          });
        }
      } else {
        p.node.specifiers.forEach((s) => {
          if (
            t.isExportSpecifier(s) &&
            t.isIdentifier(s.exported) &&
            s.exported.name === exportName &&
            t.isIdentifier(s.local)
          ) {
            const bind = p.scope.getBinding(s.local.name);
            if (bind) compPaths.push(bind.path);
          }
        });
      }
    },
  });

  if (compPaths.length === 0) {
    PORTAL_COMP_CACHE.set(cacheKey, false);
    return false;
  }

  let found = false;

  // Track visited paths to prevent infinite recursion with circular component dependencies
  const visitedPaths = new WeakSet();

  function subtreeHasPortals(nodePath) {
    if (!nodePath || !nodePath.node) return false;
    if (visitedPaths.has(nodePath.node)) return false;
    visitedPaths.add(nodePath.node);

    let hit = false;
    nodePath.traverse({
      JSXOpeningElement(op) {
        if (hit) return;
        const name = jsxNameOf(op.node, t);
        if (isPortalishName(name, RADIX_ROOTS)) {
          hit = true;
          return;
        }
        if (/^[A-Z]/.test(name || "")) {
          // capitalized child: may itself be portalish
          const binding = op.scope.getBinding(name);
          if (binding && binding.path) {
            const childHas = subtreeHasPortals(binding.path);
            if (childHas) {
              hit = true;
              return;
            }
          } else if (importMap.has(name)) {
            const { absPath: childPath, importName } = importMap.get(name);
            const childHas = fileExportHasPortals({
              absPath: childPath,
              exportName: importName,
              t,
              traverse,
              parser,
              RADIX_ROOTS,
              depth: depth + 1,
            });
            if (childHas) {
              hit = true;
              return;
            }
          }
        }
      },
    });
    return hit;
  }

  for (const pth of compPaths) {
    if (!pth || !pth.node) continue;
    if (subtreeHasPortals(pth)) {
      found = true;
      break;
    }
  }

  PORTAL_COMP_CACHE.set(cacheKey, found);
  return found;
}

// Decide at a usage site whether <ElementName /> is a composite that should be excluded
function usageIsCompositePortal({
  elementName,
  jsxPath,
  state,
  t,
  traverse,
  parser,
  RADIX_ROOTS,
}) {
  // Same-file binding?
  const binding = jsxPath.scope.getBinding(elementName);
  if (binding && binding.path) {
    // Analyze the definition directly
    let hit = false;
    binding.path.traverse({
      JSXOpeningElement(op) {
        if (hit) return;
        const name = jsxNameOf(op.node, t);
        if (isPortalishName(name, RADIX_ROOTS)) {
          hit = true;
          return;
        }
        if (/^[A-Z]/.test(name || "")) {
          const innerBinding = op.scope.getBinding(name);
          if (innerBinding && innerBinding.path) {
            innerBinding.path.traverse(this.visitors);
          }
        }
      },
    });
    if (hit) return true;
  }

  // Imported binding (named)
  if (binding && binding.path && binding.path.isImportSpecifier()) {
    const from = binding.path.parent.source.value;
    const fileFrom =
      state.filename ||
      state.file?.opts?.filename ||
      state.file?.sourceFileName ||
      __filename;
    const absPath = resolveImportPath(from, fileFrom);
    if (!absPath) return false;
    const exportName = binding.path.node.imported.name;
    return fileExportHasPortals({
      absPath,
      exportName,
      t,
      traverse,
      parser,
      RADIX_ROOTS,
    });
  }

  // Imported binding (default)
  if (binding && binding.path && binding.path.isImportDefaultSpecifier()) {
    const from = binding.path.parent.source.value;
    const fileFrom =
      state.filename ||
      state.file?.opts?.filename ||
      state.file?.sourceFileName ||
      __filename;
    const absPath = resolveImportPath(from, fileFrom);
    if (!absPath) return false;
    return fileExportHasPortals({
      absPath,
      exportName: "default",
      t,
      traverse,
      parser,
      RADIX_ROOTS,
    });
  }

  return false;
}

// ───────────────────────────────────────────────────────────────────────────────
// Babel plugin for JSX transformation - adds metadata to all elements
const babelMetadataPlugin = ({ types: t }) => {
  const fileNameCache = new Map();

  const ARRAY_METHODS = new Set([
    "map",
    "forEach",
    "filter",
    "reduce",
    "reduceRight",
    "flatMap",
    "find",
    "findIndex",
    "some",
    "every",
  ]);

  // ───────────────────────────────────────────────────────────────────────────
  // Expression Source Analysis - Track where dynamic content comes from
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Analyzes an expression to determine its source type and traceability
   * @param {NodePath} exprPath - The expression path to analyze
   * @param {Object} state - Babel state with filename info
   * @returns {Object} Source info: { type, varName, file, line, path, isEditable }
   */
  function analyzeExpression(exprPath, state) {
    if (!exprPath || !exprPath.node) return null;

    const node = exprPath.node;

    // Handle Identifier (simple variable reference like {name})
    if (t.isIdentifier(node)) {
      return analyzeIdentifier(node.name, exprPath, state);
    }

    // Handle MemberExpression (like item.name or obj.prop.value)
    if (t.isMemberExpression(node)) {
      return analyzeMemberExpression(exprPath, state);
    }

    // Handle CallExpression (like formatDate(item.date))
    if (t.isCallExpression(node)) {
      return { type: "computed", isEditable: false };
    }

    // Handle TemplateLiteral (like `Hello ${name}`)
    if (t.isTemplateLiteral(node)) {
      return { type: "template", isEditable: false };
    }

    // Handle ConditionalExpression (like condition ? a : b)
    if (t.isConditionalExpression(node)) {
      return { type: "computed", isEditable: false };
    }

    // Handle LogicalExpression (like a && b)
    if (t.isLogicalExpression(node)) {
      return { type: "computed", isEditable: false };
    }

    // Handle BinaryExpression (like a + b)
    if (t.isBinaryExpression(node)) {
      return { type: "computed", isEditable: false };
    }

    return { type: "unknown", isEditable: false };
  }

  /**
   * Analyzes an identifier to determine its binding source
   * @param {string} name - The identifier name
   * @param {NodePath} exprPath - The expression path
   * @param {Object} state - Babel state
   * @param {Object} options - Options
   * @param {boolean} options.skipArrayContext - Skip array iteration context check to avoid recursion
   */
  function analyzeIdentifier(name, exprPath, state, options = {}) {
    const { skipArrayContext = false } = options;

    const binding = exprPath.scope.getBinding(name);
    if (!binding) {
      return { type: "external", varName: name, isEditable: false };
    }

    const bindingPath = binding.path;

    // Check if this identifier is an array iteration item parameter
    // (e.g., `review` in `reviews.map((review) => ...)`)
    // Skip this check when called from getArrayIterationContext to avoid infinite recursion
    if (!skipArrayContext) {
      const arrayContext = getArrayIterationContext(exprPath, state);
      if (arrayContext && arrayContext.itemParam === name) {
        return {
          type: "static-imported",
          varName: arrayContext.arrayVar,
          file: arrayContext.arrayFile,
          absFile: arrayContext.absFile,
          line: arrayContext.arrayLine,
          isEditable: arrayContext.isEditable,
          valueType: "array-item",
          arrayContext: arrayContext,
        };
      }
    }

    // Check for props (function parameters)
    if (bindingPath.isIdentifier() && bindingPath.parentPath.isFunctionDeclaration()) {
      // Try to trace the prop back to its source in the same file
      const componentName = getContainingComponentName(exprPath);
      const tracedSource = tracePropToSource(name, componentName, exprPath, state);

      if (tracedSource && tracedSource.isEditable) {
        return {
          type: "prop",
          varName: tracedSource.varName, // Use traced source's variable name (e.g., "reviews" not "review")
          propName: name, // Keep original prop name for reference
          tracedFrom: tracedSource,
          file: tracedSource.file,
          absFile: tracedSource.absFile,
          line: tracedSource.line,
          path: tracedSource.path,
          isEditable: true,
          arrayContext: tracedSource.arrayContext,
        };
      }

      return { type: "prop", varName: name, isEditable: false };
    }

    // Check if it's a destructured prop from function params
    if (bindingPath.isObjectPattern() ||
        (bindingPath.parentPath && bindingPath.parentPath.isObjectPattern())) {
      const funcParent = bindingPath.findParent(p =>
        p.isFunctionDeclaration() || p.isArrowFunctionExpression() || p.isFunctionExpression()
      );
      if (funcParent && funcParent.node.params.some(param => {
        if (t.isIdentifier(param)) return false;
        if (t.isObjectPattern(param)) return true;
        return false;
      })) {
        // Try to trace the prop back to its source in the same file
        const componentName = getContainingComponentName(exprPath);
        const tracedSource = tracePropToSource(name, componentName, exprPath, state);

        if (tracedSource && tracedSource.isEditable) {
          return {
            type: "prop",
            varName: tracedSource.varName, // Use traced source's variable name (e.g., "reviews" not "review")
            propName: name, // Keep original prop name for reference
            tracedFrom: tracedSource,
            file: tracedSource.file,
            absFile: tracedSource.absFile,
            line: tracedSource.line,
            path: tracedSource.path,
            isEditable: true,
            arrayContext: tracedSource.arrayContext,
          };
        }

        return { type: "prop", varName: name, isEditable: false };
      }
    }

    // Check for useState
    if (bindingPath.isVariableDeclarator()) {
      const init = bindingPath.node.init;
      if (t.isCallExpression(init) && t.isIdentifier(init.callee)) {
        const calleeName = init.callee.name;
        if (calleeName === "useState" || calleeName === "useReducer" ||
            calleeName === "useContext" || calleeName === "useMemo" ||
            calleeName === "useCallback") {
          return { type: "state", varName: name, isEditable: false };
        }
      }
    }

    // Check for imports
    if (bindingPath.isImportSpecifier() || bindingPath.isImportDefaultSpecifier()) {
      const importDecl = bindingPath.parentPath.node;
      const source = importDecl.source.value;

      // Only track @/ and ./ imports as potentially editable
      if (source.startsWith("@/") || source.startsWith("./") || source.startsWith("../")) {
        const fileFrom = state.filename || state.file?.opts?.filename || __filename;
        const absPath = resolveImportPath(source, fileFrom);

        if (absPath) {
          // Get the original export name
          let exportName = name;
          if (bindingPath.isImportSpecifier() && t.isIdentifier(bindingPath.node.imported)) {
            exportName = bindingPath.node.imported.name;
          }

          // Try to find the variable declaration in the imported file
          const varInfo = findExportedVariableInfo(absPath, exportName);

          return {
            type: "static-imported",
            varName: exportName,
            file: source,
            absFile: absPath,
            line: varInfo?.line || null,
            isEditable: varInfo?.isEditable || false,
            valueType: varInfo?.valueType || null,
          };
        }
      }

      return { type: "external", varName: name, isEditable: false };
    }

    // Check for local const declarations
    if (bindingPath.isVariableDeclarator()) {
      const parent = bindingPath.parentPath;
      if (parent.isVariableDeclaration() && parent.node.kind === "const") {
        const init = bindingPath.node.init;

        // Get the current file path for local variables
        const currentFile = state.filename || state.file?.opts?.filename || null;

        // Check if it's a simple editable value
        if (t.isStringLiteral(init) || t.isNumericLiteral(init)) {
          return {
            type: "static-local",
            varName: name,
            absFile: currentFile,
            line: bindingPath.node.loc?.start.line || null,
            isEditable: true,
            valueType: "literal",
          };
        }

        if (t.isArrayExpression(init)) {
          return {
            type: "static-local",
            varName: name,
            absFile: currentFile,
            line: bindingPath.node.loc?.start.line || null,
            isEditable: true,
            valueType: "array",
          };
        }

        if (t.isObjectExpression(init)) {
          return {
            type: "static-local",
            varName: name,
            absFile: currentFile,
            line: bindingPath.node.loc?.start.line || null,
            isEditable: true,
            valueType: "object",
          };
        }
      }
    }

    return { type: "unknown", varName: name, isEditable: false };
  }

  /**
   * Analyzes a member expression like item.name or obj.prop.value
   */
  function analyzeMemberExpression(exprPath, state, options = {}) {
    const node = exprPath.node;

    // Build the property path (e.g., "name" or "address.city")
    const propPath = buildPropertyPath(node);

    // Get the root object
    let root = node;
    while (t.isMemberExpression(root.object)) {
      root = root.object;
    }

    const rootObj = root.object;

    if (t.isIdentifier(rootObj)) {
      const rootName = rootObj.name;

      // Check if we're inside an array iteration (like .map())
      // Skip if we're already analyzing the array source to prevent infinite recursion
      const arrayContext = options.skipArrayContext
        ? null
        : getArrayIterationContext(exprPath, state);

      if (arrayContext && arrayContext.itemParam === rootName) {
        // This is item.property where item comes from array.map(item => ...)
        return {
          type: "static-imported",
          varName: arrayContext.arrayVar,
          file: arrayContext.arrayFile,
          absFile: arrayContext.absFile,
          line: arrayContext.arrayLine,
          path: propPath,
          isEditable: arrayContext.isEditable,
          valueType: "array-item",
          arrayContext: arrayContext,
        };
      }

      // Analyze the root identifier
      // Pass skipArrayContext to avoid infinite recursion when called from getArrayIterationContext
      const rootInfo = analyzeIdentifier(rootName, exprPath, state, options);
      if (rootInfo) {
        return {
          ...rootInfo,
          path: propPath,
        };
      }
    }

    return { type: "unknown", path: propPath, isEditable: false };
  }

  /**
   * Builds a dot-notation path from a MemberExpression
   */
  function buildPropertyPath(node) {
    const parts = [];
    let current = node;

    while (t.isMemberExpression(current)) {
      if (t.isIdentifier(current.property)) {
        parts.unshift(current.property.name);
      } else if (t.isNumericLiteral(current.property)) {
        parts.unshift(`[${current.property.value}]`);
      } else if (t.isStringLiteral(current.property)) {
        parts.unshift(current.property.value);
      }
      current = current.object;
    }

    return parts.join(".");
  }

  /**
   * Gets the JSX element name from an opening element
   */
  function getJSXElementName(openingElement) {
    const n = openingElement?.name;
    if (t.isJSXIdentifier(n)) return n.name;
    if (t.isJSXMemberExpression(n)) return n.property.name;
    return null;
  }

  /**
   * Gets the containing component name for an expression path
   */
  function getContainingComponentName(exprPath) {
    let current = exprPath;
    while (current) {
      if (current.isFunctionDeclaration() && current.node.id) {
        return current.node.id.name;
      }
      if (current.isVariableDeclarator() && t.isIdentifier(current.node.id)) {
        return current.node.id.name;
      }
      if (current.isArrowFunctionExpression() || current.isFunctionExpression()) {
        // Check if parent is variable declarator
        const parent = current.parentPath;
        if (parent && parent.isVariableDeclarator() && t.isIdentifier(parent.node.id)) {
          return parent.node.id.name;
        }
      }
      current = current.parentPath;
    }
    return null;
  }

  /**
   * Traces a prop back to where it was passed in the same file
   * @param {string} propName - The prop name to trace
   * @param {string} componentName - The component that receives the prop
   * @param {NodePath} exprPath - The expression path for scope access
   * @param {Object} state - Babel state
   * @returns {Object|null} Source info if traced, null otherwise
   */
  function tracePropToSource(propName, componentName, exprPath, state) {
    if (!componentName) return null;

    const programPath = exprPath.findParent(p => p.isProgram());
    if (!programPath) return null;

    let tracedSource = null;

    programPath.traverse({
      JSXOpeningElement(jsxPath) {
        if (tracedSource) return;

        const elementName = getJSXElementName(jsxPath.node);
        if (elementName !== componentName) return;

        // Look for the prop being passed
        for (const attr of jsxPath.node.attributes || []) {
          if (!t.isJSXAttribute(attr)) continue;
          if (!t.isJSXIdentifier(attr.name) || attr.name.name !== propName) continue;
          if (!t.isJSXExpressionContainer(attr.value)) continue;

          // Found matching prop - analyze the expression passed to it
          const attrs = jsxPath.get('attributes');
          const attrPath = attrs.find(
            a => a.isJSXAttribute() &&
                 t.isJSXIdentifier(a.node.name) &&
                 a.node.name.name === propName
          );

          if (attrPath) {
            const valuePath = attrPath.get('value');
            if (valuePath && valuePath.isJSXExpressionContainer()) {
              const innerExpr = valuePath.get('expression');
              if (innerExpr && innerExpr.node) {
                tracedSource = analyzeExpression(innerExpr, state);
              }
            }
          }
        }
      }
    });

    // If found in same file, return it
    if (tracedSource) return tracedSource;

    // Cross-file lookup
    return lookupCrossFilePropSource(propName, componentName, state);
  }

  /**
   * Records prop source information for cross-file prop tracing.
   */
  function recordPropSources(componentName, jsxPath, state) {
    const binding = jsxPath.scope.getBinding(componentName);
    if (!binding) return;

    const componentAbsPath = getComponentSourcePath(binding, state);
    if (!componentAbsPath) return; // Same-file, existing logic handles

    const openingElement = jsxPath.node.openingElement;
    for (const attr of openingElement.attributes || []) {
      if (!t.isJSXAttribute(attr)) continue;
      if (!t.isJSXIdentifier(attr.name)) continue;
      if (!t.isJSXExpressionContainer(attr.value)) continue;

      const propName = attr.name.name;

      // Find the attribute path
      const attrPath = jsxPath.get('openingElement.attributes').find(
        a => a.isJSXAttribute() && a.node.name?.name === propName
      );
      if (!attrPath) continue;

      const valuePath = attrPath.get('value.expression');
      if (!valuePath?.node) continue;

      // Analyze the expression being passed
      const sourceInfo = analyzeExpression(valuePath, state);
      const arrayContext = getArrayIterationContext(valuePath, state);

      // Cache it
      const cacheKey = `${componentAbsPath}::${componentName}::${propName}`;
      PROP_SOURCE_CACHE.set(cacheKey, {
        sourceInfo,
        arrayContext: arrayContext || sourceInfo?.arrayContext,
        fromFile: state.filename
      });
    }
  }

  /**
   * Looks up prop source from cross-file cache.
   */
  function lookupCrossFilePropSource(propName, componentName, state) {
    const currentFile = state.filename || state.file?.opts?.filename;
    if (!currentFile) return null;

    const cacheKey = `${currentFile}::${componentName}::${propName}`;
    const cached = PROP_SOURCE_CACHE.get(cacheKey);

    if (cached && cached.sourceInfo) {
      return cached.sourceInfo;
    }

    // Cache miss - try lazy evaluation
    return lazyEvaluatePropSource(propName, componentName, currentFile);
  }

  /**
   * Lazily finds prop sources by scanning cached ASTs for component usages.
   */
  function lazyEvaluatePropSource(propName, componentName, componentFile) {
    const traverse = require("@babel/traverse").default;

    for (const [absPath, cached] of FILE_AST_CACHE) {
      if (absPath === componentFile) continue;

      const ast = cached.ast;
      if (!ast) continue;

      let result = null;

      traverse(ast, {
        ImportDeclaration(importPath) {
          if (result) return;

          const source = importPath.node.source.value;
          const resolvedPath = resolveImportPath(source, absPath);
          if (resolvedPath !== componentFile) return;

          // Find the local name for this import
          let localName = null;
          for (const spec of importPath.node.specifiers) {
            if (t.isImportSpecifier(spec) && spec.imported.name === componentName) {
              localName = spec.local.name;
            } else if (t.isImportDefaultSpecifier(spec)) {
              localName = spec.local.name;
            }
          }
          if (!localName) return;

          // Search for usages of this component
          importPath.parentPath.parentPath.traverse({
            JSXOpeningElement(jsxPath) {
              if (result) return;

              const elemName = getJSXElementName(jsxPath.node);
              if (elemName !== localName) return;

              // Find the prop
              for (const attr of jsxPath.node.attributes || []) {
                if (!t.isJSXAttribute(attr)) continue;
                if (!t.isJSXIdentifier(attr.name) || attr.name.name !== propName) continue;
                if (!t.isJSXExpressionContainer(attr.value)) continue;

                const attrPath = jsxPath.get('attributes').find(
                  a => a.isJSXAttribute() && a.node.name?.name === propName
                );

                if (attrPath) {
                  const valuePath = attrPath.get('value.expression');
                  if (valuePath?.node) {
                    const mockState = { filename: absPath };
                    result = analyzeExpression(valuePath, mockState);

                    // Cache for future
                    const cacheKey = `${componentFile}::${componentName}::${propName}`;
                    PROP_SOURCE_CACHE.set(cacheKey, {
                      sourceInfo: result,
                      arrayContext: result?.arrayContext,
                      fromFile: absPath
                    });
                  }
                }
              }
            }
          });
        }
      });

      if (result) return result;
    }

    return null;
  }

  /**
   * Detects if we're inside an array iteration (.map(), etc.) and extracts context
   */
  function getArrayIterationContext(exprPath, state) {
    // Find the parent .map() or similar call
    const callExprParent = exprPath.findParent((p) => {
      if (!p.isCallExpression()) return false;

      const { callee } = p.node;
      if (!t.isMemberExpression(callee) || !t.isIdentifier(callee.property)) {
        return false;
      }

      return ARRAY_METHODS.has(callee.property.name);
    });

    if (!callExprParent) return null;

    const callExpr = callExprParent.node;
    const callee = callExpr.callee;

    // Get the array being iterated
    const arrayNode = callee.object;

    // Get the callback function
    const callback = callExpr.arguments[0];
    if (!callback) return null;

    // Get item parameter name(s)
    let itemParam = null;
    let indexParam = null;

    if (t.isArrowFunctionExpression(callback) || t.isFunctionExpression(callback)) {
      const params = callback.params;
      if (params.length > 0 && t.isIdentifier(params[0])) {
        itemParam = params[0].name;
      }
      if (params.length > 1 && t.isIdentifier(params[1])) {
        indexParam = params[1].name;
      }
    }

    if (!itemParam) return null;

    // Analyze the array source
    let arrayVar = null;
    let arrayFile = null;
    let absFile = null;
    let arrayLine = null;
    let isEditable = false;

    if (t.isIdentifier(arrayNode)) {
      arrayVar = arrayNode.name;
      // Pass skipArrayContext to avoid infinite recursion
      const arrayInfo = analyzeIdentifier(arrayVar, callExprParent.get("callee.object"), state, { skipArrayContext: true });

      if (arrayInfo) {
        arrayFile = arrayInfo.file || null;
        absFile = arrayInfo.absFile || null;
        arrayLine = arrayInfo.line || null;
        isEditable = arrayInfo.isEditable && arrayInfo.valueType === "array";
      }
    } else if (t.isMemberExpression(arrayNode)) {
      // Handle cases like data.items.map(...)
      const memberInfo = analyzeMemberExpression(
        callExprParent.get("callee.object"),
        state,
        { skipArrayContext: true }
      );
      if (memberInfo) {
        arrayVar = memberInfo.varName;
        arrayFile = memberInfo.file || null;
        absFile = memberInfo.absFile || null;
        arrayLine = memberInfo.line || null;
        // Array within object is more complex, mark as not editable for now
        isEditable = false;
      }
    }

    return {
      arrayVar,
      arrayFile,
      absFile,
      arrayLine,
      itemParam,
      indexParam,
      isEditable,
    };
  }

  /**
   * Finds info about an exported variable in a file
   */
  function findExportedVariableInfo(absPath, exportName) {
    const parser = require("@babel/parser");
    const traverse = require("@babel/traverse").default;

    const ast = parseFileAst(absPath, parser);
    if (!ast) return null;

    let result = null;

    traverse(ast, {
      // Check export const VARIABLE = value
      ExportNamedDeclaration(p) {
        if (result) return;

        if (p.node.declaration && t.isVariableDeclaration(p.node.declaration)) {
          const decl = p.node.declaration;
          for (const declarator of decl.declarations) {
            if (t.isIdentifier(declarator.id) && declarator.id.name === exportName) {
              const init = declarator.init;
              let valueType = null;
              let isEditable = false;

              if (t.isStringLiteral(init) || t.isNumericLiteral(init)) {
                valueType = "literal";
                isEditable = true;
              } else if (t.isArrayExpression(init)) {
                valueType = "array";
                isEditable = true;
              } else if (t.isObjectExpression(init)) {
                valueType = "object";
                isEditable = true;
              }

              result = {
                line: declarator.loc?.start.line || null,
                valueType,
                isEditable,
              };
              return;
            }
          }
        }

        // Check export { VARIABLE }
        if (p.node.specifiers) {
          for (const spec of p.node.specifiers) {
            if (t.isExportSpecifier(spec) &&
                t.isIdentifier(spec.exported) &&
                spec.exported.name === exportName) {
              // Need to find the original declaration
              const localName = t.isIdentifier(spec.local) ? spec.local.name : exportName;
              const binding = p.scope.getBinding(localName);
              if (binding && binding.path.isVariableDeclarator()) {
                const init = binding.path.node.init;
                let valueType = null;
                let isEditable = false;

                if (t.isStringLiteral(init) || t.isNumericLiteral(init)) {
                  valueType = "literal";
                  isEditable = true;
                } else if (t.isArrayExpression(init)) {
                  valueType = "array";
                  isEditable = true;
                } else if (t.isObjectExpression(init)) {
                  valueType = "object";
                  isEditable = true;
                }

                result = {
                  line: binding.path.node.loc?.start.line || null,
                  valueType,
                  isEditable,
                };
              }
              return;
            }
          }
        }
      },
    });

    return result;
  }

  /**
   * Extracts expression source info from JSX children and builds metadata attributes
   */
  function getExpressionSourceAttributes(jsxElement, state) {
    const attrs = [];
    const children = jsxElement.children || [];

    for (const child of children) {
      if (t.isJSXExpressionContainer(child) && !t.isJSXEmptyExpression(child.expression)) {
        // We found an expression - analyze it
        // Note: We need to create a path for the expression, but we only have the node
        // For now, we'll do basic analysis using the scope from the JSX element
        const expr = child.expression;

        // Basic classification based on node type
        if (t.isIdentifier(expr)) {
          attrs.push({ name: "x-expr-var", value: expr.name });
        } else if (t.isMemberExpression(expr)) {
          const propPath = buildPropertyPath(expr);
          attrs.push({ name: "x-expr-path", value: propPath });

          // Get root object name
          let root = expr;
          while (t.isMemberExpression(root.object)) {
            root = root.object;
          }
          if (t.isIdentifier(root.object)) {
            attrs.push({ name: "x-expr-var", value: root.object.name });
          }
        }

        // Only process first expression for now
        break;
      }
    }

    return attrs;
  }

  // ---------- helpers ----------
  const getName = (openingEl) => {
    const n = openingEl?.name;
    return t.isJSXIdentifier(n) ? n.name : null;
  };

  const hasProp = (openingEl, name) =>
    openingEl?.attributes?.some(
      (a) =>
        t.isJSXAttribute(a) &&
        t.isJSXIdentifier(a.name) &&
        a.name.name === name,
    );

  const isPortalPrimitive = (name) =>
    /(Trigger|Portal|Content|Overlay|Viewport|Anchor|Arrow)$/.test(name);

  const RADIX_ROOTS = new Set([
    "Dialog",
    "Popover",
    "Tooltip",
    "DropdownMenu",
    "ContextMenu",
    "AlertDialog",
    "HoverCard",
    "Select",
    "Menubar",
    "NavigationMenu",
    "Sheet",
    "Drawer",
    "Toast",
    "Command",
  ]);

  // direct child of a Trigger / asChild / Slot parent?
  const isDirectChildOfAsChildOrTrigger = (jsxPath) => {
    const p = jsxPath.parentPath;
    if (!p || !p.isJSXElement || !p.isJSXElement()) return false;
    const open = p.node.openingElement;
    const name = getName(open) || "";
    return hasProp(open, "asChild") || /Trigger$/.test(name) || name === "Slot";
  };

  const alreadyHasXMeta = (openingEl) =>
    openingEl.attributes?.some(
      (a) =>
        t.isJSXAttribute(a) &&
        t.isJSXIdentifier(a.name) &&
        a.name.name.startsWith("x-"),
    );

  // ⬇️ Add { markExcluded } option: when true, include x-excluded="true"
  const insertMetaAttributes = (openingEl, attrsToAdd) => {
    if (!openingEl.attributes) openingEl.attributes = [];
    const spreadIndex = openingEl.attributes.findIndex((attr) =>
      t.isJSXSpreadAttribute(attr),
    );
    if (spreadIndex === -1) {
      openingEl.attributes.push(...attrsToAdd);
    } else {
      openingEl.attributes.splice(spreadIndex, 0, ...attrsToAdd);
    }
  };

  const pushMetaAttrs = (
    openingEl,
    { normalizedPath, lineNumber, elementName, isDynamic, sourceInfo, arrayContext },
    { markExcluded = false } = {},
  ) => {
    if (alreadyHasXMeta(openingEl)) return;
    const metaAttrs = [
      t.jsxAttribute(
        t.jsxIdentifier("x-file-name"),
        t.stringLiteral(normalizedPath),
      ),
      t.jsxAttribute(
        t.jsxIdentifier("x-line-number"),
        t.stringLiteral(String(lineNumber)),
      ),
      t.jsxAttribute(
        t.jsxIdentifier("x-component"),
        t.stringLiteral(elementName),
      ),
      t.jsxAttribute(
        t.jsxIdentifier("x-id"),
        t.stringLiteral(`${normalizedPath}_${lineNumber}`),
      ),
      t.jsxAttribute(
        t.jsxIdentifier("x-dynamic"),
        t.stringLiteral(isDynamic ? "true" : "false"),
      ),
    ];
    if (markExcluded) {
      metaAttrs.push(
        t.jsxAttribute(t.jsxIdentifier("x-excluded"), t.stringLiteral("true")),
      );
    }

    // Add source tracking attributes if available
    if (sourceInfo) {
      // x-source-type: static-local | static-imported | prop | state | computed | external
      if (sourceInfo.type) {
        metaAttrs.push(
          t.jsxAttribute(t.jsxIdentifier("x-source-type"), t.stringLiteral(sourceInfo.type))
        );
      }

      // x-source-var: the variable name
      if (sourceInfo.varName) {
        metaAttrs.push(
          t.jsxAttribute(t.jsxIdentifier("x-source-var"), t.stringLiteral(sourceInfo.varName))
        );
      }

      // x-source-file: for imports, the import path
      if (sourceInfo.file) {
        metaAttrs.push(
          t.jsxAttribute(t.jsxIdentifier("x-source-file"), t.stringLiteral(sourceInfo.file))
        );
      }

      // x-source-file-abs: absolute path for relative imports (needed by backend)
      if (sourceInfo.absFile) {
        metaAttrs.push(
          t.jsxAttribute(t.jsxIdentifier("x-source-file-abs"), t.stringLiteral(sourceInfo.absFile))
        );
      }

      // x-source-line: line number in source file
      if (sourceInfo.line) {
        metaAttrs.push(
          t.jsxAttribute(t.jsxIdentifier("x-source-line"), t.stringLiteral(String(sourceInfo.line)))
        );
      }

      // x-source-path: for object property access (e.g., "name" or "address.city")
      if (sourceInfo.path) {
        metaAttrs.push(
          t.jsxAttribute(t.jsxIdentifier("x-source-path"), t.stringLiteral(sourceInfo.path))
        );
      }

      // x-source-editable: whether this dynamic content can be edited
      metaAttrs.push(
        t.jsxAttribute(
          t.jsxIdentifier("x-source-editable"),
          t.stringLiteral(sourceInfo.isEditable ? "true" : "false")
        )
      );
    }

    // Add array iteration context if available
    if (arrayContext) {
      if (arrayContext.arrayVar) {
        metaAttrs.push(
          t.jsxAttribute(t.jsxIdentifier("x-array-var"), t.stringLiteral(arrayContext.arrayVar))
        );
      }
      if (arrayContext.arrayFile) {
        metaAttrs.push(
          t.jsxAttribute(t.jsxIdentifier("x-array-file"), t.stringLiteral(arrayContext.arrayFile))
        );
      }
      if (arrayContext.arrayLine) {
        metaAttrs.push(
          t.jsxAttribute(t.jsxIdentifier("x-array-line"), t.stringLiteral(String(arrayContext.arrayLine)))
        );
      }
      if (arrayContext.itemParam) {
        metaAttrs.push(
          t.jsxAttribute(t.jsxIdentifier("x-array-item-param"), t.stringLiteral(arrayContext.itemParam))
        );
      }
    }

    insertMetaAttributes(openingEl, metaAttrs);
  };

  // Check if a JSX element is inside an array iteration callback
  function isJSXDynamic(jsxPath) {
    // Use findParent to reliably check if we're inside a function callback to an array method
    return !!jsxPath.findParent((path) => {
      // Look for ArrowFunctionExpression or FunctionExpression
      if (!path.isArrowFunctionExpression() && !path.isFunctionExpression()) {
        return false;
      }

      // Check if parent is a CallExpression with an array method
      const parentCall = path.parentPath;
      if (!parentCall || !parentCall.isCallExpression()) {
        return false;
      }

      const { callee } = parentCall.node;
      if (!t.isMemberExpression(callee) || !t.isIdentifier(callee.property)) {
        return false;
      }

      return ARRAY_METHODS.has(callee.property.name);
    });
  }

  // Check if JSX element has any expressions (data dependencies)
  function hasAnyExpression(jsxElement) {
    const openingEl = jsxElement.openingElement;
    if (openingEl?.attributes?.some((attr) => t.isJSXSpreadAttribute(attr))) {
      return true;
    }
    for (const child of jsxElement.children) {
      if (
        t.isJSXExpressionContainer(child) &&
        !t.isJSXEmptyExpression(child.expression)
      ) {
        return true;
      }
      if (t.isJSXSpreadChild(child)) {
        return true;
      }
    }
    return false;
  }

  // bring in parser/traverse for dynamic analysis
  const parser = require("@babel/parser");
  const traverse = require("@babel/traverse").default;

  function pathHasDynamicJSX(targetPath) {
    if (!targetPath || !targetPath.node) return false;
    let dynamic = false;
    targetPath.traverse({
      JSXExpressionContainer(p) {
        if (dynamic) return;
        if (!t.isJSXEmptyExpression(p.node.expression)) {
          dynamic = true;
          p.stop();
        }
      },
      JSXSpreadAttribute(p) {
        if (dynamic) return;
        dynamic = true;
        p.stop();
      },
      JSXSpreadChild(p) {
        if (dynamic) return;
        dynamic = true;
        p.stop();
      },
    });
    return dynamic;
  }

  function pathIsDynamicComponent(path, visited = new WeakSet()) {
    if (!path || !path.node) return false;
    if (visited.has(path.node)) return false;
    visited.add(path.node);

    if (
      path.isFunctionDeclaration() ||
      path.isFunctionExpression() ||
      path.isArrowFunctionExpression()
    ) {
      return pathHasDynamicJSX(path);
    }

    if (path.isVariableDeclarator()) {
      const init = path.get("init");
      return init && init.node ? pathIsDynamicComponent(init, visited) : false;
    }

    if (path.isIdentifier()) {
      const binding = path.scope.getBinding(path.node.name);
      if (binding) {
        return pathIsDynamicComponent(binding.path, visited);
      }
      return false;
    }

    if (path.isCallExpression()) {
      const args = path.get("arguments") || [];
      if (args.length === 0) {
        return true;
      }
      for (const arg of args) {
        if (pathIsDynamicComponent(arg, visited)) {
          return true;
        }
      }
      return false;
    }

    if (path.isReturnStatement()) {
      const argument = path.get("argument");
      return argument && argument.node
        ? pathIsDynamicComponent(argument, visited)
        : false;
    }

    if (path.isExpressionStatement()) {
      const expr = path.get("expression");
      return expr && expr.node ? pathIsDynamicComponent(expr, visited) : false;
    }

    if (path.isJSXElement() || path.isJSXFragment()) {
      return pathHasDynamicJSX(path);
    }

    if (path.isObjectExpression()) {
      return true;
    }

    return false;
  }

  function fileExportIsDynamic({ absPath, exportName }) {
    if (!absPath) return false;
    const cacheKey = `${absPath}::${exportName}`;
    if (DYNAMIC_COMP_CACHE.has(cacheKey)) {
      return DYNAMIC_COMP_CACHE.get(cacheKey);
    }

    // Set sentinel value to prevent infinite recursion with circular imports
    // This will be updated with the actual result at the end
    DYNAMIC_COMP_CACHE.set(cacheKey, false);

    const ast = parseFileAst(absPath, parser);
    if (!ast) {
      DYNAMIC_COMP_CACHE.set(cacheKey, false);
      return false;
    }

    let dynamic = false;
    const visited = new WeakSet();

    function evaluatePath(nodePath) {
      if (!nodePath || !nodePath.node || dynamic) return;
      if (visited.has(nodePath.node)) return;
      visited.add(nodePath.node);

      if (
        nodePath.isFunctionDeclaration() ||
        nodePath.isFunctionExpression() ||
        nodePath.isArrowFunctionExpression()
      ) {
        if (pathHasDynamicJSX(nodePath)) {
          dynamic = true;
        }
        return;
      }

      if (nodePath.isVariableDeclarator()) {
        evaluatePath(nodePath.get("init"));
        return;
      }

      if (nodePath.isIdentifier()) {
        const binding = nodePath.scope.getBinding(nodePath.node.name);
        if (binding) {
          evaluatePath(binding.path);
        }
        return;
      }

      if (nodePath.isCallExpression()) {
        const args = nodePath.get("arguments") || [];
        if (args.length === 0) {
          dynamic = true;
          return;
        }
        for (const arg of args) {
          evaluatePath(arg);
          if (dynamic) return;
        }
        return;
      }

      if (nodePath.isReturnStatement()) {
        evaluatePath(nodePath.get("argument"));
        return;
      }

      if (nodePath.isExpressionStatement()) {
        evaluatePath(nodePath.get("expression"));
        return;
      }

      if (nodePath.isJSXElement() || nodePath.isJSXFragment()) {
        if (pathHasDynamicJSX(nodePath)) {
          dynamic = true;
        }
        return;
      }

      if (nodePath.isObjectExpression()) {
        dynamic = true;
      }
    }

    traverse(ast, {
      ExportDefaultDeclaration(p) {
        if (dynamic || exportName !== "default") return;
        evaluatePath(p.get("declaration"));
      },
      ExportNamedDeclaration(p) {
        if (dynamic || exportName === "default") return;

        if (p.node.declaration) {
          const decl = p.node.declaration;
          if (t.isFunctionDeclaration(decl) && decl.id?.name === exportName) {
            evaluatePath(p.get("declaration"));
            return;
          }
          if (t.isVariableDeclaration(decl)) {
            decl.declarations.forEach((vd, i) => {
              if (t.isIdentifier(vd.id) && vd.id.name === exportName) {
                evaluatePath(p.get(`declaration.declarations.${i}`));
              }
            });
            return;
          }
        }

        p.node.specifiers.forEach((s) => {
          if (
            !t.isExportSpecifier(s) ||
            !t.isIdentifier(s.exported) ||
            s.exported.name !== exportName
          ) {
            return;
          }

          if (p.node.source) {
            const from = p.node.source.value;
            const resolved = resolveImportPath(from, absPath);
            if (resolved) {
              if (
                fileExportIsDynamic({
                  absPath: resolved,
                  exportName: t.isIdentifier(s.local)
                    ? s.local.name
                    : exportName,
                })
              ) {
                dynamic = true;
              }
            }
            return;
          }

          if (t.isIdentifier(s.local)) {
            const binding = p.scope.getBinding(s.local.name);
            if (binding) {
              evaluatePath(binding.path);
            }
          }
        });
      },
    });

    DYNAMIC_COMP_CACHE.set(cacheKey, dynamic);
    return dynamic;
  }

  function componentBindingIsDynamic({ binding, state }) {
    if (!binding || !binding.path) return false;
    const bindingPath = binding.path;

    if (BINDING_DYNAMIC_CACHE.has(bindingPath.node)) {
      return BINDING_DYNAMIC_CACHE.get(bindingPath.node);
    }

    let result = false;

    if (bindingPath.isImportSpecifier()) {
      const from = bindingPath.parent.source.value;
      const fileFrom =
        state.filename ||
        state.file?.opts?.filename ||
        state.file?.sourceFileName ||
        __filename;
      const absPath = resolveImportPath(from, fileFrom);
      const exportName = bindingPath.node.imported.name;
      result = !!absPath ? fileExportIsDynamic({ absPath, exportName }) : false;
      BINDING_DYNAMIC_CACHE.set(bindingPath.node, result);
      return result;
    }

    if (bindingPath.isImportDefaultSpecifier()) {
      const from = bindingPath.parent.source.value;
      const fileFrom =
        state.filename ||
        state.file?.opts?.filename ||
        state.file?.sourceFileName ||
        __filename;
      const absPath = resolveImportPath(from, fileFrom);
      result = !!absPath
        ? fileExportIsDynamic({ absPath, exportName: "default" })
        : false;
      BINDING_DYNAMIC_CACHE.set(bindingPath.node, result);
      return result;
    }

    if (bindingPath.isImportNamespaceSpecifier()) {
      BINDING_DYNAMIC_CACHE.set(bindingPath.node, false);
      return false;
    }

    result = pathIsDynamicComponent(bindingPath);
    BINDING_DYNAMIC_CACHE.set(bindingPath.node, result);
    return result;
  }

  return {
    name: "element-metadata-plugin",
    visitor: {
      // Add metadata attributes to React components (capitalized JSX)
      JSXElement(jsxPath, state) {
        const openingElement = jsxPath.node.openingElement;
        if (!openingElement?.name) return;
        const elementName = getName(openingElement);
        if (!elementName) return;

        // Only process capitalized components (React components)
        if (!/^[A-Z]/.test(elementName)) {
          if (hasProp(openingElement, "data-ve-dynamic") || hasProp(openingElement, "x-excluded")) {
            return;
          }
          wrapDynamicExpressionChildren(jsxPath, t);
          return;
        }

        // Exclude components that have strict child requirements or break when wrapped
        const excludedComponents = new Set([
          "Route",
          "Routes",
          "Switch",
          "Redirect",
          "Navigate", // React Router
          "Fragment",
          "Suspense",
          "StrictMode", // React built-ins
          "ErrorBoundary",
          "Provider",
          "Consumer",
          "Outlet",
          "Link",
          "NavLink",
          // Portal-based primitives/triggers (Radix/Floating-UI)
          "Sheet",
          "SheetContent",
          "SheetOverlay",
          "SheetPortal",
          "Popover",
          "PopoverContent",
          "Tooltip",
          "TooltipContent",
          "DropdownMenu",
          "DropdownMenuContent",
          "DropdownMenuSubContent",
          "ContextMenu",
          "ContextMenuContent",
          "ContextMenuSubContent",
          "HoverCard",
          "HoverCardContent",
          "Select",
          "SelectContent",
          "Menubar",
          "MenubarContent",
          "MenubarSubContent",
          "MenubarPortal",
          "Drawer",
          "DrawerContent",
          "DrawerOverlay",
          "DrawerPortal",
          "Toast",
          "ToastViewport",
          "NavigationMenu",
          "NavigationMenuContent",
          "DropdownMenuPortal",
          "ContextMenuPortal",
          "Command",
          "CommandDialog",
          // Triggers & measured bits
          "PopoverTrigger",
          "TooltipTrigger",
          "DropdownMenuTrigger",
          "ContextMenuTrigger",
          "HoverCardTrigger",
          "SelectTrigger",
          "MenubarTrigger",
          "NavigationMenuTrigger",
          "SheetTrigger",
          "DrawerTrigger",
          "CommandInput",
          "Slot",
          // icons (avoid wrapping)
          "X",
          "ChevronRight",
          "ChevronLeft",
          "ChevronUp",
          "ChevronDown",
          "Check",
          "Plus",
          "Minus",
          "Search",
          "Menu",
          "Settings",
          "User",
          "Home",
          "ArrowRight",
          "ArrowLeft",
        ]);
        if (excludedComponents.has(elementName)) return;

        // Check if parent is a component that strictly validates children
        const parent = jsxPath.parentPath;
        if (parent?.isJSXElement?.()) {
          const parentName = getName(parent.node.openingElement) || "";
          if (
            [
              "Routes",
              "Switch",
              "BrowserRouter",
              "Router",
              "MemoryRouter",
              "HashRouter",
            ].includes(parentName) ||
            RADIX_ROOTS.has(parentName)
          ) {
            // Don't wrap if direct child of strict parent (e.g., Route inside Routes, or Radix roots)
            return;
          }
        }

        // Record prop sources for cross-file tracing
        recordPropSources(elementName, jsxPath, state);

        // Get source location
        const filename =
          state.filename ||
          state.file?.opts?.filename ||
          state.file?.sourceFileName ||
          "unknown";
        const lineNumber = openingElement.loc?.start.line || 0;

        if (!fileNameCache.has(filename)) {
          const base = path.basename(filename).replace(/\.[jt]sx?$/, "");
          fileNameCache.set(filename, base);
        }
        const normalizedPath = fileNameCache.get(filename) || "unknown";

        // Detect dynamic
        let isDynamic = isJSXDynamic(jsxPath) || hasAnyExpression(jsxPath.node);

        // Only check component definition if there are NO static text children.
        // If there ARE text children (like <Label>Habit Name</Label>), their editability
        // depends on whether they're static strings, not on the component's internal implementation.
        if (!isDynamic) {
          const hasStaticTextChildren = jsxPath.node.children.some(
            (child) => t.isJSXText(child) && child.value.trim()
          );
          if (!hasStaticTextChildren) {
            const binding = jsxPath.scope.getBinding(elementName);
            if (binding) {
              isDynamic = componentBindingIsDynamic({ binding, state });
            }
          }
        }

        // Analyze expression sources if element has expressions
        let sourceInfo = null;
        let arrayContext = null;

        if (isDynamic) {
          // Find expression children and analyze them
          const children = jsxPath.node.children || [];
          for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (t.isJSXExpressionContainer(child) && !t.isJSXEmptyExpression(child.expression)) {
              // Get the path to this expression container
              const exprContainerPath = jsxPath.get(`children.${i}`);
              if (exprContainerPath && exprContainerPath.node) {
                const exprPath = exprContainerPath.get("expression");
                if (exprPath && exprPath.node) {
                  sourceInfo = analyzeExpression(exprPath, state);
                  if (sourceInfo && sourceInfo.arrayContext) {
                    arrayContext = sourceInfo.arrayContext;
                  }
                }
              }
              break; // Only analyze first expression
            }
          }

          // If no expression children, check if we're in array iteration context
          if (!sourceInfo) {
            const iterContext = getArrayIterationContext(jsxPath, state);
            if (iterContext) {
              arrayContext = iterContext;
              sourceInfo = {
                type: iterContext.isEditable ? "static-imported" : "external",
                varName: iterContext.arrayVar,
                file: iterContext.arrayFile,
                absFile: iterContext.absFile,
                line: iterContext.arrayLine,
                isEditable: iterContext.isEditable,
              };
            }
          }
        }

        // Check if parent is a detected composite portal
        const parentIsCompositePortal = (() => {
          const p = jsxPath.parentPath;
          if (!p || !p.isJSXElement || !p.isJSXElement()) return false;
          const parentName = getName(p.node.openingElement);
          if (!parentName || !/^[A-Z]/.test(parentName)) return false;

          // Check if parent was detected as composite portal
          return usageIsCompositePortal({
            elementName: parentName,
            jsxPath: p,
            state,
            t,
            traverse,
            parser,
            RADIX_ROOTS,
          });
        })();

        // 🚫 If this element is a direct child of a Trigger/asChild/Slot,
        // or itself a primitive/root, DO NOT WRAP — stamp x-* on the element itself
        // and mark it with x-excluded="true".
        if (
          hasProp(openingElement, "asChild") ||
          isPortalPrimitive(elementName) ||
          RADIX_ROOTS.has(elementName) ||
          isDirectChildOfAsChildOrTrigger(jsxPath) ||
          parentIsCompositePortal
        ) {
          pushMetaAttrs(
            openingElement,
            { normalizedPath, lineNumber, elementName, isDynamic, sourceInfo, arrayContext },
            { markExcluded: true },
          );
          return;
        }

        // NEW: dynamic composite detection (e.g., DemoPopover renders Popover primitives)
        const compositePortal = usageIsCompositePortal({
          elementName,
          jsxPath,
          state,
          t,
          traverse,
          parser,
          RADIX_ROOTS,
        });

        if (compositePortal) {
          // Composite portal: stamp + mark excluded
          pushMetaAttrs(
            openingElement,
            { normalizedPath, lineNumber, elementName, isDynamic, sourceInfo, arrayContext },
            { markExcluded: true },
          );
          return;
        }

        // ✅ Normal case: add metadata attributes directly
        pushMetaAttrs(
          openingElement,
          { normalizedPath, lineNumber, elementName, isDynamic, sourceInfo, arrayContext },
        );
      },

      // Add metadata to native HTML elements (lowercase JSX)
      JSXOpeningElement(jsxPath, state) {
        if (!jsxPath.node.name || !jsxPath.node.name.name) {
          return;
        }

        const elementName = jsxPath.node.name.name;

        // Skip fragments
        if (elementName === "Fragment") {
          return;
        }

        // Only process lowercase (native HTML)
        if (/^[A-Z]/.test(elementName)) {
          return;
        }

        // Skip if already has metadata
        const hasDebugAttr = jsxPath.node.attributes.some(
          (attr) =>
            t.isJSXAttribute(attr) &&
            attr.name &&
            attr.name.name &&
            attr.name.name.startsWith("x-"),
        );
        if (hasDebugAttr) return;

        // Get source location
        const filename =
          state.filename ||
          state.file?.opts?.filename ||
          state.file?.sourceFileName ||
          "unknown";

        const lineNumber = jsxPath.node.loc?.start.line || 0;

        if (!fileNameCache.has(filename)) {
          const base = path.basename(filename).replace(/\.[jt]sx?$/, "");
          fileNameCache.set(filename, base);
        }
        const normalizedPath = fileNameCache.get(filename) || "unknown";

        // Detect if native element is dynamic:
        // 1. Inside an array iteration (.map(), etc.)
        // 2. Has expression children (like {variable} or {obj.prop})
        const parentElement = jsxPath.parentPath; // JSXElement containing this opening element
        const isInArrayMethod = parentElement ? isJSXDynamic(parentElement) : false;
        const hasExpressions = parentElement && parentElement.node ? hasAnyExpression(parentElement.node) : false;
        const isDynamic = isInArrayMethod || hasExpressions;

        // Analyze expression sources if element has expressions
        let sourceInfo = null;
        let arrayContext = null;

        if (isDynamic && parentElement && parentElement.node) {
          // Find expression children and analyze them
          const children = parentElement.node.children || [];
          for (let i = 0; i < children.length; i++) {
            const child = children[i];
            if (t.isJSXExpressionContainer(child) && !t.isJSXEmptyExpression(child.expression)) {
              // Get the path to this expression container
              const exprContainerPath = parentElement.get(`children.${i}`);
              if (exprContainerPath && exprContainerPath.node) {
                const exprPath = exprContainerPath.get("expression");
                if (exprPath && exprPath.node) {
                  sourceInfo = analyzeExpression(exprPath, state);
                  if (sourceInfo && sourceInfo.arrayContext) {
                    arrayContext = sourceInfo.arrayContext;
                  }
                }
              }
              break; // Only analyze first expression
            }
          }

          // If no expression children, check if we're in array iteration context
          if (!sourceInfo) {
            const iterContext = getArrayIterationContext(parentElement, state);
            if (iterContext) {
              arrayContext = iterContext;
              sourceInfo = {
                type: iterContext.isEditable ? "static-imported" : "external",
                varName: iterContext.arrayVar,
                file: iterContext.arrayFile,
                absFile: iterContext.absFile,
                line: iterContext.arrayLine,
                isEditable: iterContext.isEditable,
              };
            }
          }
        }

        // Build metadata attributes
        const metaAttrs = [
          t.jsxAttribute(
            t.jsxIdentifier("x-file-name"),
            t.stringLiteral(normalizedPath),
          ),
          t.jsxAttribute(
            t.jsxIdentifier("x-line-number"),
            t.stringLiteral(String(lineNumber)),
          ),
          t.jsxAttribute(
            t.jsxIdentifier("x-component"),
            t.stringLiteral(elementName),
          ),
          t.jsxAttribute(
            t.jsxIdentifier("x-id"),
            t.stringLiteral(`${normalizedPath}_${lineNumber}`),
          ),
          t.jsxAttribute(
            t.jsxIdentifier("x-dynamic"),
            t.stringLiteral(isDynamic ? "true" : "false"),
          ),
        ];

        // Add source tracking attributes if available
        if (sourceInfo) {
          if (sourceInfo.type) {
            metaAttrs.push(
              t.jsxAttribute(t.jsxIdentifier("x-source-type"), t.stringLiteral(sourceInfo.type))
            );
          }
          if (sourceInfo.varName) {
            metaAttrs.push(
              t.jsxAttribute(t.jsxIdentifier("x-source-var"), t.stringLiteral(sourceInfo.varName))
            );
          }
          if (sourceInfo.file) {
            metaAttrs.push(
              t.jsxAttribute(t.jsxIdentifier("x-source-file"), t.stringLiteral(sourceInfo.file))
            );
          }
          if (sourceInfo.absFile) {
            metaAttrs.push(
              t.jsxAttribute(t.jsxIdentifier("x-source-file-abs"), t.stringLiteral(sourceInfo.absFile))
            );
          }
          if (sourceInfo.line) {
            metaAttrs.push(
              t.jsxAttribute(t.jsxIdentifier("x-source-line"), t.stringLiteral(String(sourceInfo.line)))
            );
          }
          if (sourceInfo.path) {
            metaAttrs.push(
              t.jsxAttribute(t.jsxIdentifier("x-source-path"), t.stringLiteral(sourceInfo.path))
            );
          }
          metaAttrs.push(
            t.jsxAttribute(
              t.jsxIdentifier("x-source-editable"),
              t.stringLiteral(sourceInfo.isEditable ? "true" : "false")
            )
          );
        }

        // Add array iteration context if available
        if (arrayContext) {
          if (arrayContext.arrayVar) {
            metaAttrs.push(
              t.jsxAttribute(t.jsxIdentifier("x-array-var"), t.stringLiteral(arrayContext.arrayVar))
            );
          }
          if (arrayContext.arrayFile) {
            metaAttrs.push(
              t.jsxAttribute(t.jsxIdentifier("x-array-file"), t.stringLiteral(arrayContext.arrayFile))
            );
          }
          if (arrayContext.arrayLine) {
            metaAttrs.push(
              t.jsxAttribute(t.jsxIdentifier("x-array-line"), t.stringLiteral(String(arrayContext.arrayLine)))
            );
          }
          if (arrayContext.itemParam) {
            metaAttrs.push(
              t.jsxAttribute(t.jsxIdentifier("x-array-item-param"), t.stringLiteral(arrayContext.itemParam))
            );
          }
        }

        // Add metadata attributes
        insertMetaAttributes(jsxPath.node, metaAttrs);
      },
    },
  };
};

module.exports = babelMetadataPlugin;
