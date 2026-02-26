import { Project, InterfaceDeclaration, ClassDeclaration, FunctionDeclaration, TypeAliasDeclaration, EnumDeclaration } from 'ts-morph';
import { TsMorphSelector } from '../src/index';

// Create a sample TypeScript project
const project = new Project({
  useInMemoryFileSystem: true,
});

// Add sample source files
project.createSourceFile('sample1.ts', `
export interface User {
  id: number;
  name: string;
  email: string;
}

export interface Product {
  id: number;
  title: string;
  price: number;
}

export class UserService {
  getUser(id: number): User {
    // Implementation
    return {} as User;
  }
  
  createUser(name: string, email: string): User {
    // Implementation
    return {} as User;
  }
}

export class ProductService {
  getProduct(id: number): Product {
    return {} as Product;
  }
}

export function testUserService() {
  const service = new UserService();
  return service;
}

export function testProductService() {
  const service = new ProductService();
  return service;
}

export type UserId = number;
export type ProductId = string;
`);

project.createSourceFile('sample2.ts', `
import { User } from './sample1';

export enum UserRole {
  Admin = 'admin',
  User = 'user',
  Guest = 'guest'
}

export class AdminService {
  private users: User[] = [];
  
  addUser(user: User): void {
    this.users.push(user);
  }
}
`);

// Create selector instance
const selector = new TsMorphSelector(project);

console.log('=== TS-Morph Selector Examples ===\n');

// Example 1: Find all interfaces
console.log('1. Find all interfaces:');
const interfaces = selector.query<InterfaceDeclaration>('SELECT * FROM InterfaceDeclaration');
console.log(`   Found ${interfaces.nodes.length} interfaces:`);
interfaces.nodes.forEach(node => {
  console.log(`   - ${node.getName()}`);
});

// Example 2: Find specific interface by name
console.log('\n2. Find interface named "User":');
const userInterface = selector.query<InterfaceDeclaration>("SELECT * FROM InterfaceDeclaration WHERE name = 'User'");
console.log(`   Found ${userInterface.nodes.length} interface(s)`);
userInterface.nodes.forEach(node => {
  console.log(`   - ${node.getName()}`);
});

// Example 3: Find classes
console.log('\n3. Find all classes:');
const classes = selector.query<ClassDeclaration>('SELECT * FROM ClassDeclaration');
console.log(`   Found ${classes.nodes.length} classes:`);
classes.nodes.forEach(node => {
  console.log(`   - ${node.getName()}`);
});

// Example 4: Find functions with LIKE pattern
console.log('\n4. Find functions starting with "test":');
const testFunctions = selector.query<FunctionDeclaration>("SELECT * FROM FunctionDeclaration WHERE name LIKE 'test%'");
console.log(`   Found ${testFunctions.nodes.length} function(s):`);
testFunctions.nodes.forEach(node => {
  console.log(`   - ${node.getName()}`);
});

// Example 5: Find classes with "Service" in name
console.log('\n5. Find classes with "Service" in name:');
const serviceClasses = selector.query<ClassDeclaration>("SELECT * FROM ClassDeclaration WHERE name LIKE '%Service'");
console.log(`   Found ${serviceClasses.nodes.length} class(es):`);
serviceClasses.nodes.forEach(node => {
  console.log(`   - ${node.getName()}`);
});

// Example 6: Find specific classes using IN operator
console.log('\n6. Find UserService or ProductService classes:');
const specificClasses = selector.query<ClassDeclaration>("SELECT * FROM ClassDeclaration WHERE name IN ('UserService', 'ProductService')");
console.log(`   Found ${specificClasses.nodes.length} class(es):`);
specificClasses.nodes.forEach(node => {
  console.log(`   - ${node.getName()}`);
});

// Example 7: Find type aliases
console.log('\n7. Find all type aliases:');
const typeAliases = selector.query<TypeAliasDeclaration>('SELECT * FROM TypeAliasDeclaration');
console.log(`   Found ${typeAliases.nodes.length} type alias(es):`);
typeAliases.nodes.forEach(node => {
  console.log(`   - ${node.getName()}`);
});

// Example 8: Find enums
console.log('\n8. Find all enums:');
const enums = selector.query<EnumDeclaration>('SELECT * FROM EnumDeclaration');
console.log(`   Found ${enums.nodes.length} enum(s):`);
enums.nodes.forEach(node => {
  console.log(`   - ${node.getName()}`);
});

// Example 9: Find interface with references
console.log('\n9. Find User interface WITH REFERENCES:');
const userWithRefs = selector.query<InterfaceDeclaration>("SELECT * FROM InterfaceDeclaration WHERE name = 'User' WITH REFERENCES");
console.log(`   Found ${userWithRefs.nodes.length} interface(s)`);
if (userWithRefs.references) {
  userWithRefs.nodes.forEach(node => {
    const refs = userWithRefs.references!.get(node);
    console.log(`   - ${node.getName()} has ${refs?.length || 0} reference(s)`);
    if (refs && refs.length > 0) {
      refs.slice(0, 5).forEach(ref => {
        const sourceFile = ref.getSourceFile().getBaseName();
        const line = ref.getStartLineNumber();
        console.log(`     * ${sourceFile}:${line}`);
      });
      if (refs.length > 5) {
        console.log(`     * ... and ${refs.length - 5} more`);
      }
    }
  });
}

// Example 10: Validate query
console.log('\n10. Validate queries:');
const validQuery = selector.validate('SELECT * FROM InterfaceDeclaration');
console.log(`   Valid query: ${validQuery.valid}`);

const invalidQuery = selector.validate('SELECT * InvalidQuery');
console.log(`   Invalid query: ${invalidQuery.valid}`);
if (invalidQuery.error) {
  console.log(`   Error: ${invalidQuery.error}`);
}

console.log('\n=== End of Examples ===');
