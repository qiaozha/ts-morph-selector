import { Project, InterfaceDeclaration, TypeAliasDeclaration, Node } from 'ts-morph';
import { TsMorphSelector } from '../src/index';

// Create a sample TypeScript project with complex interfaces
const project = new Project({
  useInMemoryFileSystem: true,
});

// Add sample source files with interfaces and their property types
project.createSourceFile('models.ts', `
export interface User {
  id: UserId;
  name: string;
  profile: UserProfile;
  permissions: Permission[];
}

export interface UserProfile {
  avatar: string;
  bio: string;
  location: Location;
}

export interface Location {
  city: string;
  country: string;
}

export type UserId = string;
export type Permission = 'read' | 'write' | 'admin';
`);

project.createSourceFile('services.ts', `
import { User, UserProfile, UserId } from './models';

export class UserService {
  getUser(id: UserId): User {
    return {} as User;
  }
  
  updateProfile(profile: UserProfile): void {
    // Implementation
  }
}

export function createUser(id: UserId, profile: UserProfile): User {
  return {} as User;
}
`);

const selector = new TsMorphSelector(project);

console.log('=== Query Interface with Property Types References ===\n');

// Method 1: Query the interface and manually traverse property types
console.log('Method 1: Query interface and find property type references\n');

const userInterface = selector.query<InterfaceDeclaration>(
  "SELECT * FROM InterfaceDeclaration WHERE name = 'User'"
);

if (userInterface.nodes.length > 0) {
  const iface = userInterface.nodes[0];
  console.log(`Interface: ${iface.getName()}`);
  console.log(`Properties:`);
  
  const properties = iface.getProperties();
  const propertyTypeReferences = new Map<string, Node[]>();
  
  for (const prop of properties) {
    const propName = prop.getName();
    const propType = prop.getType();
    const propTypeText = propType.getText();
    
    console.log(`  - ${propName}: ${propTypeText}`);
    
    // Get the symbol for the property type
    const typeSymbol = propType.getSymbol();
    
    if (typeSymbol) {
      const declarations = typeSymbol.getDeclarations();
      
      for (const decl of declarations) {
        // Find references to this type declaration
        if ('findReferences' in decl && typeof (decl as any).findReferences === 'function') {
          const refEntries = (decl as any).findReferences();
          const refs: Node[] = [];
          
          for (const refEntry of refEntries) {
            for (const ref of refEntry.getReferences()) {
              const refNode = ref.getNode();
              if (refNode) {
                refs.push(refNode);
              }
            }
          }
          
          if (refs.length > 0) {
            propertyTypeReferences.set(propTypeText, refs);
            console.log(`    → Type "${propTypeText}" has ${refs.length} reference(s)`);
          }
        }
      }
    }
  }
  
  // Show detailed references
  console.log(`\nDetailed References for Property Types:`);
  for (const [typeName, refs] of propertyTypeReferences) {
    console.log(`\n  Type: ${typeName}`);
    refs.slice(0, 3).forEach(ref => {
      const sourceFile = ref.getSourceFile().getBaseName();
      const line = ref.getStartLineNumber();
      const text = ref.getText();
      console.log(`    - ${sourceFile}:${line} -> ${text.substring(0, 50)}`);
    });
    if (refs.length > 3) {
      console.log(`    ... and ${refs.length - 3} more`);
    }
  }
}

// Method 2: Query interface WITH REFERENCES + separately query property types
console.log('\n\n' + '='.repeat(60));
console.log('Method 2: Query with REFERENCES + query property types\n');

const userWithRefs = selector.query<InterfaceDeclaration>(
  "SELECT * FROM InterfaceDeclaration WHERE name = 'User' WITH REFERENCES"
);

console.log(`Interface: ${userWithRefs.nodes[0].getName()}`);
console.log(`Direct references to interface: ${userWithRefs.references?.get(userWithRefs.nodes[0])?.length || 0}`);

// Now query the property types
const propertyTypeNames = ['UserProfile', 'UserId'];

console.log(`\nQuerying property types:`);
for (const typeName of propertyTypeNames) {
  // Try as interface first
  let ifaceResult = selector.query<InterfaceDeclaration>(
    `SELECT * FROM InterfaceDeclaration WHERE name = '${typeName}' WITH REFERENCES`
  );
  
  if (ifaceResult.nodes.length > 0) {
    const node = ifaceResult.nodes[0];
    const refs = ifaceResult.references?.get(node);
    console.log(`  - ${typeName} (Interface): ${refs?.length || 0} reference(s)`);
    
    if (refs && refs.length > 0) {
      refs.slice(0, 3).forEach(ref => {
        const sourceFile = ref.getSourceFile().getBaseName();
        const line = ref.getStartLineNumber();
        console.log(`      * ${sourceFile}:${line}`);
      });
    }
  } else {
    // Try as type alias
    const typeResult = selector.query<TypeAliasDeclaration>(
      `SELECT * FROM TypeAliasDeclaration WHERE name = '${typeName}' WITH REFERENCES`
    );
    
    if (typeResult.nodes.length > 0) {
      const node = typeResult.nodes[0];
      const refs = typeResult.references?.get(node);
      console.log(`  - ${typeName} (Type Alias): ${refs?.length || 0} reference(s)`);
      
      if (refs && refs.length > 0) {
        refs.slice(0, 3).forEach(ref => {
          const sourceFile = ref.getSourceFile().getBaseName();
          const line = ref.getStartLineNumber();
          console.log(`      * ${sourceFile}:${line}`);
        });
      }
    }
  }
}

// Method 3: Helper function for complete interface analysis
console.log('\n\n' + '='.repeat(60));
console.log('Method 3: Complete interface analysis with helper function\n');

function analyzeInterfaceWithPropertyTypes(
  interfaceName: string,
  selector: TsMorphSelector
) {
  const result = selector.query<InterfaceDeclaration>(
    `SELECT * FROM InterfaceDeclaration WHERE name = '${interfaceName}' WITH REFERENCES`
  );
  
  if (result.nodes.length === 0) {
    console.log(`Interface "${interfaceName}" not found`);
    return;
  }
  
  const iface = result.nodes[0];
  const analysis = {
    interface: interfaceName,
    directReferences: result.references?.get(iface)?.length || 0,
    properties: [] as Array<{
      name: string;
      type: string;
      typeReferences: number;
    }>,
    allReferencesCount: 0
  };
  
  // Analyze each property
  const properties = iface.getProperties();
  
  for (const prop of properties) {
    const propType = prop.getType();
    const propTypeText = propType.getText();
    const typeSymbol = propType.getSymbol();
    
    let typeRefCount = 0;
    
    if (typeSymbol) {
      const declarations = typeSymbol.getDeclarations();
      
      for (const decl of declarations) {
        if ('findReferences' in decl && typeof (decl as any).findReferences === 'function') {
          const refEntries = (decl as any).findReferences();
          
          for (const refEntry of refEntries) {
            typeRefCount += refEntry.getReferences().length;
          }
        }
      }
    }
    
    analysis.properties.push({
      name: prop.getName(),
      type: propTypeText,
      typeReferences: typeRefCount
    });
    
    analysis.allReferencesCount += typeRefCount;
  }
  
  analysis.allReferencesCount += analysis.directReferences;
  
  return analysis;
}

const analysis = analyzeInterfaceWithPropertyTypes('User', selector);

if (analysis) {
  console.log(`Interface: ${analysis.interface}`);
  console.log(`Direct references: ${analysis.directReferences}`);
  console.log(`Properties:`);
  
  for (const prop of analysis.properties) {
    console.log(`  - ${prop.name}: ${prop.type} (${prop.typeReferences} references)`);
  }
  
  console.log(`\nTotal references (interface + all property types): ${analysis.allReferencesCount}`);
}

console.log('\n' + '='.repeat(60));
console.log('\n✓ Complete! Use these methods to query interfaces with property type references.');
