const ts = require('typescript');
const fs = require('fs');

const files = fs.readFileSync('changed-files.txt', 'utf8').split('\n').filter(Boolean);

function hasDocstring(node, sourceFile) {
  const comments = ts.getLeadingCommentRanges(sourceFile.text, node.getFullStart());
  if (!comments) return false;
  return comments.some(c => sourceFile.text.substring(c.pos, c.end).startsWith('/**'));
}

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  if (file.includes('.spec.ts')) return; // ignore tests
  const sourceCode = fs.readFileSync(file, 'utf8');
  const sourceFile = ts.createSourceFile(file, sourceCode, ts.ScriptTarget.Latest, true);
  
  const edits = [];

  function isExported(node) {
    if (ts.isSourceFile(node.parent)) {
      return node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
    }
    // For variable statements
    if (ts.isVariableDeclarationList(node.parent) && ts.isVariableStatement(node.parent.parent)) {
      return node.parent.parent.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword);
    }
    return false;
  }

  function visit(node) {
    let targetNode = null;

    if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) {
      targetNode = node;
    } else if (ts.isMethodDeclaration(node)) {
      targetNode = node;
    } else if (ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
      if (ts.isVariableDeclaration(node.parent) && ts.isVariableDeclarationList(node.parent.parent) && ts.isVariableStatement(node.parent.parent.parent)) {
        targetNode = node.parent.parent.parent;
      }
    }

    if (targetNode) {
      // Check if it's exported or if it's a class method (public/private/protected)
      const isClassMethod = ts.isMethodDeclaration(targetNode);
      if (isExported(targetNode) || isClassMethod) {
        // Find the right place to insert.
        // It should be right before the decorators, or before the export keyword.
        let pos = targetNode.getStart(sourceFile, false);
        if (targetNode.decorators && targetNode.decorators.length > 0) {
          pos = targetNode.decorators[0].getStart(sourceFile, false);
        } else if (targetNode.modifiers && targetNode.modifiers.length > 0) {
          pos = targetNode.modifiers[0].getStart(sourceFile, false);
        }

        // We check `hasDocstring` using getFullStart() to see if there is already a JSDoc
        const ranges = ts.getLeadingCommentRanges(sourceFile.text, targetNode.getFullStart());
        let hasJSDoc = false;
        if (ranges) {
          hasJSDoc = ranges.some(r => sourceFile.text.substring(r.pos, r.end).startsWith('/**'));
        }

        if (!hasJSDoc) {
          // ensure we don't insert multiple times at the same position
          if (!edits.some(e => e.pos === pos)) {
            edits.push({ pos, text: '/** Auto-generated docstring */\n' });
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (edits.length > 0) {
    edits.sort((a, b) => b.pos - a.pos);
    let newCode = sourceCode;
    edits.forEach(edit => {
      newCode = newCode.slice(0, edit.pos) + edit.text + newCode.slice(edit.pos);
    });
    fs.writeFileSync(file, newCode, 'utf8');
    console.log(`Updated ${file} (${edits.length} docstrings added)`);
  }
});
