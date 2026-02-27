import { Project, InterfaceDeclaration, ClassDeclaration, FunctionDeclaration, SourceFile } from 'ts-morph';
import { TsMorphSelector } from '../src/index';

// Create a project with multiple files
const project = new Project({
  useInMemoryFileSystem: true,
});

// Add service files
project.createSourceFile('src/services/user.service.ts', `
  export interface UserServiceConfig {
    apiUrl: string;
    timeout: number;
  }

  export class UserService {
    constructor(private config: UserServiceConfig) {}
    
    async getUser(id: number): Promise<User> {
      // Implementation
      return {} as User;
    }
    
    async updateUser(id: number, data: Partial<User>): Promise<User> {
      // Implementation
      return {} as User;
    }
  }

  interface User {
    id: number;
    name: string;
  }
`);

project.createSourceFile('src/services/product.service.ts', `
  export interface ProductServiceConfig {
    cacheEnabled: boolean;
  }

  export class ProductService {
    async getProduct(id: number): Promise<Product> {
      return {} as Product;
    }
  }

  interface Product {
    id: number;
    title: string;
    price: number;
  }
`);

// Add controller files
project.createSourceFile('src/controllers/user.controller.ts', `
  export class UserController {
    constructor(private userService: any) {}
    
    handleGetUser(req: Request, res: Response): void {
      // Implementation
    }
  }

  interface Request {
    params: any;
  }

  interface Response {
    json(data: any): void;
  }
`);

// Add model files
project.createSourceFile('src/models/user.model.ts', `
  export interface UserModel {
    id: number;
    name: string;
    email: string;
    createdAt: Date;
  }
`);

project.createSourceFile('src/models/product.model.ts', `
  export interface ProductModel {
    id: number;
    title: string;
    description: string;
    price: number;
  }
`);

// Add utility files
project.createSourceFile('src/utils/validators.ts', `
  export function validateEmail(email: string): boolean {
    return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);
  }

  export function validateId(id: number): boolean {
    return id > 0;
  }
`);

const selector = new TsMorphSelector(project);

console.log('=== SourceFile Querying with SQL-like Syntax ===\n');

// Example 1: Query all source files
console.log('1. Find all source files:');
const allFiles = selector.query<SourceFile>('SELECT * FROM SourceFile');
console.log(`   Found ${allFiles.nodes.length} source files:`);
allFiles.nodes.forEach(file => {
  console.log(`   - ${file.getBaseName()}`);
});

// Example 2: Filter files by baseName pattern
console.log('\n2. Find all service files using baseName pattern:');
const serviceFiles = selector.query<SourceFile>("SELECT * FROM SourceFile WHERE baseName LIKE '%.service.ts'");
console.log(`   Found ${serviceFiles.nodes.length} service files:`);
serviceFiles.nodes.forEach(file => {
  console.log(`   - ${file.getBaseName()}`);
});

// Example 3: Filter files by path pattern
console.log('\n3. Find all files in models directory:');
const modelFiles = selector.query<SourceFile>("SELECT * FROM SourceFile WHERE path LIKE '%models%'");
console.log(`   Found ${modelFiles.nodes.length} model files:`);
modelFiles.nodes.forEach(file => {
  console.log(`   - ${file.getFilePath()}`);
});

// Example 4: Filter files by exact baseName
console.log('\n4. Find specific file by exact baseName:');
const validatorFile = selector.query<SourceFile>("SELECT * FROM SourceFile WHERE baseName = 'validators.ts'");
console.log(`   Found ${validatorFile.nodes.length} file(s):`);
validatorFile.nodes.forEach(file => {
  console.log(`   - ${file.getBaseName()}`);
});

// Example 5: Use IN operator to find multiple specific files
console.log('\n5. Find multiple files using IN operator:');
const specificFiles = selector.query<SourceFile>(
  "SELECT * FROM SourceFile WHERE baseName IN ('user.service.ts', 'user.model.ts', 'user.controller.ts')"
);
console.log(`   Found ${specificFiles.nodes.length} user-related files:`);
specificFiles.nodes.forEach(file => {
  console.log(`   - ${file.getBaseName()}`);
});

// Example 6: Exclude files using NOT LIKE
console.log('\n6. Find all files except service files:');
const nonServiceFiles = selector.query<SourceFile>("SELECT * FROM SourceFile WHERE baseName NOT LIKE '%.service.ts'");
console.log(`   Found ${nonServiceFiles.nodes.length} non-service files:`);
nonServiceFiles.nodes.forEach(file => {
  console.log(`   - ${file.getBaseName()}`);
});

// Example 7: Two-step approach - first get files, then query within them
console.log('\n7. Two-step approach - find files then query within them:');
const files = selector.query<SourceFile>("SELECT * FROM SourceFile WHERE path LIKE '%services%'");
console.log(`   Step 1: Found ${files.nodes.length} service files`);

// For demonstration, create a new project with only those files
const filteredProject = new Project({ useInMemoryFileSystem: true });
files.nodes.forEach(file => {
  filteredProject.createSourceFile(file.getBaseName(), file.getText());
});

const filteredSelector = new TsMorphSelector(filteredProject);
const interfaces = filteredSelector.query<InterfaceDeclaration>('SELECT * FROM InterfaceDeclaration');
console.log(`   Step 2: Found ${interfaces.nodes.length} interfaces in service files:`);
interfaces.nodes.forEach(iface => {
  console.log(`   - ${iface.getName()}`);
});

// Example 8: Get files and then query classes within them
console.log('\n8. Get service files and query their classes:');
const serviceFilesWithClasses = selector.query<SourceFile>("SELECT * FROM SourceFile WHERE baseName LIKE '%.service.ts'");
console.log(`   Found ${serviceFilesWithClasses.nodes.length} service files`);

let totalClasses = 0;
serviceFilesWithClasses.nodes.forEach(file => {
  const classes = file.getClasses();
  totalClasses += classes.length;
  classes.forEach(cls => {
    console.log(`   - ${cls.getName()} in ${file.getBaseName()}`);
  });
});
console.log(`   Total: ${totalClasses} service classes`);

console.log('\n=== Available Query Properties for SourceFile ===\n');
console.log('When querying SourceFile, you can filter by:');
console.log('- baseName: The file name with extension (e.g., "user.service.ts")');
console.log('- path: The full file path');
console.log('- extension: The file extension (e.g., ".ts")');
console.log('- kind: The node kind name (always "SourceFile")');

console.log('\n=== Common Use Cases ===\n');

console.log('1. Find all TypeScript files:');
console.log('   SELECT * FROM SourceFile WHERE extension = ".ts"');
console.log('\n2. Find all test files:');
console.log('   SELECT * FROM SourceFile WHERE baseName LIKE "%.test.ts"');
console.log('\n3. Find files in specific directory:');
console.log('   SELECT * FROM SourceFile WHERE path LIKE "%/services/%"');
console.log('\n4. Find configuration files:');
console.log('   SELECT * FROM SourceFile WHERE baseName LIKE "%.config.ts"');
console.log('\n5. Find all files except tests:');
console.log('   SELECT * FROM SourceFile WHERE baseName NOT LIKE "%.test.ts"');
console.log('\n6. Find specific set of files:');
console.log('   SELECT * FROM SourceFile WHERE baseName IN ("index.ts", "main.ts", "app.ts")');

console.log('\n=== Two-Step Pattern for Targeted Queries ===\n');
console.log('Use SourceFile queries to narrow down your search scope:');
console.log('\nStep 1: Find the files you want:');
console.log('  const files = selector.query<SourceFile>("SELECT * FROM SourceFile WHERE baseName LIKE \'%.service.ts\'");');
console.log('');
console.log('Step 2: Work with those files directly:');
console.log('  files.nodes.forEach(file => {');
console.log('    const classes = file.getClasses();');
console.log('    const interfaces = file.getInterfaces();');
console.log('    // ... work with the nodes in each file');
console.log('  });');
console.log('\nThis approach gives you full control over which files to analyze!');

