import { Project, FunctionDeclaration, ClassDeclaration, MethodDeclaration } from 'ts-morph';
import { TsMorphSelector } from '../src/index';

// Create a project from actual source files
const project = new Project({
  tsConfigFilePath: './tsconfig.json',
});

const selector = new TsMorphSelector(project);

console.log('=== Advanced Usage Examples ===\n');

// Example 1: Find all exported items
console.log('1. Find all exported functions:');
const exportedFunctions = selector.query<FunctionDeclaration>('SELECT * FROM FunctionDeclaration');
const exported = exportedFunctions.nodes.filter(fn => fn.isExported());
console.log(`   Found ${exported.length} exported function(s)`);

// Example 2: Complex WHERE conditions
console.log('\n2. Find classes NOT named "Test%":');
const nonTestClasses = selector.query<ClassDeclaration>("SELECT * FROM ClassDeclaration WHERE name NOT LIKE 'Test%'");
console.log(`   Found ${nonTestClasses.nodes.length} class(es)`);

// Example 3: Find methods in classes
console.log('\n3. Find all class methods:');
const methods = selector.query<MethodDeclaration>('SELECT * FROM MethodDeclaration');
console.log(`   Found ${methods.nodes.length} method(s)`);

// Example 4: Get file information
console.log('\n4. Source files in project:');
const sourceFiles = project.getSourceFiles();
console.log(`   Total source files: ${sourceFiles.length}`);
sourceFiles.slice(0, 5).forEach((sf) => {
  console.log(`   - ${sf.getFilePath()}`);
});

console.log('\n=== End of Advanced Examples ===');
