import { Project, FunctionDeclaration, InterfaceDeclaration, Type, Node } from 'ts-morph';
import { TsMorphSelector } from '../src/index';

// Create a sample TypeScript project
const project = new Project({
  useInMemoryFileSystem: true,
});

// Add sample source files with functions that reference interfaces
project.createSourceFile('api.ts', `
export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Address {
  street: string;
  city: string;
  country: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  address: Address;
}

export interface CreateUserResponse {
  user: User;
  success: boolean;
}

export interface UpdateUserRequest {
  id: string;
  name?: string;
  email?: string;
  address?: Address;
}

// Function with interface parameters and return type
export function createUser(
  request: CreateUserRequest
): CreateUserResponse {
  return {
    user: { id: '1', name: request.name, email: request.email },
    success: true
  };
}

// Function with multiple interface parameters
export function updateUser(
  userId: string,
  request: UpdateUserRequest,
  address: Address
): User {
  return { id: userId, name: request.name || '', email: request.email || '' };
}

// Function with interface array return type
export function getUsers(): User[] {
  return [];
}

// Function with primitive types only
export function validateEmail(email: string): boolean {
  return true;
}

// Function with union type including interfaces
export function processUser(user: User | null): User | undefined {
  return user || undefined;
}
`);

const selector = new TsMorphSelector(project);

console.log('=== Query Referenced Interfaces in Function Declarations ===\n');

// Helper function to get all interface types referenced by a function
function getReferencedInterfaces(func: FunctionDeclaration): {
  functionName: string;
  parameters: Array<{ name: string; type: string; interfaces: string[] }>;
  returnType: { type: string; interfaces: string[] };
  allInterfaces: Set<string>;
} {
  const result = {
    functionName: func.getName() || 'anonymous',
    parameters: [] as Array<{ name: string; type: string; interfaces: string[] }>,
    returnType: { type: '', interfaces: [] as string[] },
    allInterfaces: new Set<string>()
  };
  
  // Extract interfaces from a type
  const extractInterfaces = (type: Type): string[] => {
    const interfaces: string[] = [];
    
    // Check if this type is an interface
    const symbol = type.getSymbol();
    if (symbol) {
      const declarations = symbol.getDeclarations();
      for (const decl of declarations) {
        if (Node.isInterfaceDeclaration(decl)) {
          interfaces.push(decl.getName());
        }
      }
    }
    
    // Check for union types (e.g., User | null)
    if (type.isUnion()) {
      for (const unionType of type.getUnionTypes()) {
        interfaces.push(...extractInterfaces(unionType));
      }
    }
    
    // Check for array types (e.g., User[])
    if (type.isArray()) {
      const arrayElementType = type.getArrayElementType();
      if (arrayElementType) {
        interfaces.push(...extractInterfaces(arrayElementType));
      }
    }
    
    // Check for object properties (for nested interfaces)
    const properties = type.getProperties();
    for (const prop of properties) {
      const propType = prop.getTypeAtLocation(func);
      interfaces.push(...extractInterfaces(propType));
    }
    
    return interfaces;
  };
  
  // Analyze parameters
  for (const param of func.getParameters()) {
    const paramType = param.getType();
    const paramTypeText = paramType.getText();
    const interfaces = extractInterfaces(paramType);
    
    result.parameters.push({
      name: param.getName(),
      type: paramTypeText,
      interfaces
    });
    
    interfaces.forEach(iface => result.allInterfaces.add(iface));
  }
  
  // Analyze return type
  const returnType = func.getReturnType();
  const returnTypeText = returnType.getText();
  const returnInterfaces = extractInterfaces(returnType);
  
  result.returnType = {
    type: returnTypeText,
    interfaces: returnInterfaces
  };
  
  returnInterfaces.forEach(iface => result.allInterfaces.add(iface));
  
  return result;
}

// Method 1: Analyze a specific function
console.log('Method 1: Analyze specific function by name\n');

const createUserFunc = selector.query<FunctionDeclaration>(
  "SELECT * FROM FunctionDeclaration WHERE name = 'createUser'"
);

if (createUserFunc.nodes.length > 0) {
  const func = createUserFunc.nodes[0];
  const analysis = getReferencedInterfaces(func);
  
  console.log(`Function: ${analysis.functionName}()`);
  console.log(`\nParameters:`);
  analysis.parameters.forEach(param => {
    console.log(`  - ${param.name}: ${param.type}`);
    if (param.interfaces.length > 0) {
      console.log(`    Referenced interfaces: ${param.interfaces.join(', ')}`);
    }
  });
  
  console.log(`\nReturn Type: ${analysis.returnType.type}`);
  if (analysis.returnType.interfaces.length > 0) {
    console.log(`  Referenced interfaces: ${analysis.returnType.interfaces.join(', ')}`);
  }
  
  console.log(`\nAll referenced interfaces: ${Array.from(analysis.allInterfaces).join(', ')}`);
}

// Method 2: Analyze all functions and show their interface dependencies
console.log('\n\n' + '='.repeat(70));
console.log('Method 2: Analyze all functions\n');

const allFunctions = selector.query<FunctionDeclaration>(
  'SELECT * FROM FunctionDeclaration'
);

console.log(`Found ${allFunctions.nodes.length} functions:\n`);

allFunctions.nodes.forEach(func => {
  const analysis = getReferencedInterfaces(func);
  const interfaceCount = analysis.allInterfaces.size;
  
  console.log(`📝 ${analysis.functionName}()`);
  console.log(`   Interfaces referenced: ${interfaceCount}`);
  
  if (interfaceCount > 0) {
    console.log(`   → ${Array.from(analysis.allInterfaces).join(', ')}`);
  }
});

// Method 3: Get interface details with references
console.log('\n\n' + '='.repeat(70));
console.log('Method 3: Get referenced interfaces with their usage details\n');

const updateUserFunc = selector.query<FunctionDeclaration>(
  "SELECT * FROM FunctionDeclaration WHERE name = 'updateUser'"
);

if (updateUserFunc.nodes.length > 0) {
  const func = updateUserFunc.nodes[0];
  const analysis = getReferencedInterfaces(func);
  
  console.log(`Function: ${analysis.functionName}()`);
  console.log(`Referenced interfaces: ${Array.from(analysis.allInterfaces).join(', ')}\n`);
  
  // Query each referenced interface for details
  for (const interfaceName of analysis.allInterfaces) {
    const ifaceResult = selector.query<InterfaceDeclaration>(
      `SELECT * FROM InterfaceDeclaration WHERE name = '${interfaceName}' WITH REFERENCES`
    );
    
    if (ifaceResult.nodes.length > 0) {
      const iface = ifaceResult.nodes[0];
      const refs = ifaceResult.references?.get(iface);
      
      console.log(`Interface: ${interfaceName}`);
      console.log(`  Properties: ${iface.getProperties().length}`);
      console.log(`  Total references: ${refs?.length || 0}`);
      
      // Show where it's used in the function
      const paramUsage = analysis.parameters.filter(p => p.interfaces.includes(interfaceName));
      const returnUsage = analysis.returnType.interfaces.includes(interfaceName);
      
      if (paramUsage.length > 0) {
        console.log(`  Used in parameters: ${paramUsage.map(p => p.name).join(', ')}`);
      }
      if (returnUsage) {
        console.log(`  Used in return type: ✓`);
      }
      console.log();
    }
  }
}

// Method 4: Find functions that use specific interfaces
console.log('='.repeat(70));
console.log('Method 4: Find all functions that use "User" interface\n');

const allFuncs = selector.query<FunctionDeclaration>('SELECT * FROM FunctionDeclaration');

const functionsUsingUser = allFuncs.nodes.filter(func => {
  const analysis = getReferencedInterfaces(func);
  return analysis.allInterfaces.has('User');
});

console.log(`Found ${functionsUsingUser.length} function(s) using "User" interface:\n`);

functionsUsingUser.forEach(func => {
  const analysis = getReferencedInterfaces(func);
  console.log(`  • ${analysis.functionName}()`);
  
  const paramUsage = analysis.parameters.filter(p => p.interfaces.includes('User'));
  const returnUsage = analysis.returnType.interfaces.includes('User');
  
  if (paramUsage.length > 0) {
    console.log(`    Parameters: ${paramUsage.map(p => `${p.name}: ${p.type}`).join(', ')}`);
  }
  if (returnUsage) {
    console.log(`    Return type: ${analysis.returnType.type}`);
  }
});

// Method 5: Build dependency graph
console.log('\n\n' + '='.repeat(70));
console.log('Method 5: Interface dependency graph for all functions\n');

const dependencyGraph = new Map<string, Set<string>>();

allFunctions.nodes.forEach(func => {
  const funcName = func.getName() || 'anonymous';
  const analysis = getReferencedInterfaces(func);
  dependencyGraph.set(funcName, analysis.allInterfaces);
});

console.log('Function → Interfaces dependency graph:\n');

for (const [funcName, interfaces] of dependencyGraph) {
  if (interfaces.size > 0) {
    console.log(`${funcName}`);
    interfaces.forEach(iface => {
      console.log(`  └─ ${iface}`);
    });
  }
}

console.log('\n' + '='.repeat(70));
console.log('\n✓ Complete! Use these methods to analyze function interface dependencies.');
