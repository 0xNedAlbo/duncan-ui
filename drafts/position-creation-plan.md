# Implementation Plan: Dashboard mit Positionsliste und drei Erstellungsmöglichkeiten

## Übersicht
Implementierung eines Dashboards mit Positionsliste und drei verschiedenen Methoden zum Anlegen von Uniswap V3 Positionen.

## Phase 1: Datenbank-Schema erweitern

### Vollständig normalisierte Struktur mit Token, Pool und Position Models

```prisma
// Token Model - globale Token-Daten
model Token {
  id            String   @id @default(cuid())
  
  // Chain & Address (unique zusammen)
  chain         String   // "ethereum", "arbitrum", "base"
  address       String
  
  // Token Information
  symbol        String
  name          String
  decimals      Int
  
  // Alchemy Metadata
  logoUrl       String?
  verified      Boolean  @default(false)  // Von Alchemy verified flag
  
  // Metadata Caching
  lastUpdatedAt DateTime?  // Wann zuletzt von Alchemy aktualisiert
  
  // Relations
  poolsAsToken0 Pool[]   @relation("Token0")
  poolsAsToken1 Pool[]   @relation("Token1")
  
  // Timestamps
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([chain, address])
  @@index([chain, symbol])
  @@map("tokens")
}

// Pool Model - zentrale Pool-Daten
model Pool {
  id            String   @id @default(cuid())
  
  // Chain & Address (unique zusammen)
  chain         String   // "ethereum", "arbitrum", "base"
  poolAddress   String
  
  // Token Relations
  token0Id      String
  token0        Token    @relation("Token0", fields: [token0Id], references: [id])
  token1Id      String
  token1        Token    @relation("Token1", fields: [token1Id], references: [id])
  
  // Pool Parameters
  fee           Int      // Fee in basis points (100 = 0.01%, 500 = 0.05%, 3000 = 0.3%, 10000 = 1%)
  tickSpacing   Int
  
  // Current State (updated periodically)
  currentTick   Int?
  currentPrice  String?  // As decimal string
  sqrtPriceX96  String?  // Uniswap V3 price format
  tvl           String?
  volume24h     String?
  apr           Float?
  
  // Relations
  positions     Position[]
  
  // Timestamps
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([chain, poolAddress])
  @@index([chain, token0Id, token1Id])
  @@map("pools")
}

// Simplified Position Model
model Position {
  id            String   @id @default(cuid())
  
  // Relations
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  poolId        String
  pool          Pool     @relation(fields: [poolId], references: [id])
  
  // Position Details
  tickLower     Int
  tickUpper     Int
  liquidity     String   // BigInt as String
  
  // Import Metadata
  importType    String   // "manual", "wallet", "nft"
  nftId         String?  // For NFT imports
  walletAddress String?  // For wallet imports
  
  // Position State
  status        String   @default("active") // "active", "closed", "archived"
  
  // Timestamps
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([userId, status])
  @@map("positions")
}

// User Model erweitern
model User {
  // ... existing fields ...
  positions     Position[]
}
```

### Vorteile der vollständig normalisierten Struktur
- **Maximale Normalisierung**: Tokens werden global gespeichert, nicht pro Pool
- **Keine Redundanz**: Jeder Token existiert nur einmal pro Chain in der DB
- **Zentrale Token-Daten**: Logo, Preis, Name für alle Pools verfügbar
- **Zentrale Pool-Daten**: APR, TVL, Volume für alle Positionen verfügbar
- **Bessere Performance**: Minimale Daten-Duplizierung
- **Einfachere Updates**: Token-Preise und Pool-Statistiken per Background-Job
- **Skalierbar**: Bereit für Features wie Token-Listen, Pool-Vergleiche, Portfolio-Übersicht

## Phase 2: Dashboard mit Positionsliste

### Dashboard Route (`/dashboard`)
- **Protected Route** mit Authentication Check
- **Layout:**
  - Header mit DUNCAN Titel
  - User Dropdown + Settings rechts oben
  - Hauptbereich für Positionsliste

### Positionsliste Component
**Anzeigeelemente pro Position:**
- Token Pair (z.B. WETH/USDC)
- Chain Icon & Name
- Current Value (in Quote Asset)
- PnL (absolut und %)
- Estimated APR
- Status Badge (In Range / Out of Range)
- Actions (View Details, Edit, Remove)

### "Position hinzufügen" Button
**Ausklappbares Menü mit drei Optionen:**
```
[+] Position hinzufügen
    ├── 🔧 Manuell konfigurieren
    ├── 👛 Aus Wallet importieren
    └── 🎫 NFT Position importieren
```

## Phase 3: Drei Erstellungsmethoden

### Option 1: Manuelle Konfiguration
**Modal/Drawer mit Formular:**

1. **Chain Auswahl**
   - Dropdown: Ethereum, Arbitrum, Base
   
2. **Token Pair Eingabe**
   - Token 0 (Base): Input mit Autocomplete
   - Token 1 (Quote): Input mit Autocomplete
   
3. **Pool Auswahl**
   - Zeigt verfügbare Pools für Token Pair
   - Fee Tiers: 0.01%, 0.05%, 0.3%, 1%
   
4. **Range Configuration**
   - Initial: MIN_TICK bis MAX_TICK (Full Range)
   - Später: Custom Range Selector
   
5. **Position Size**
   - Input in Quote Asset Units
   
6. **Validierung & Speicherung**

### Option 2: Wallet Import
**Import Flow:**

1. **Wallet Connection oder Address Input**
   - "Connect Wallet" Button
   - Oder: Manual Address Input Field
   
2. **Position Discovery**
   - Query Uniswap V3 Subgraph
   - Zeige alle offenen Positionen
   
3. **Selection Interface**
   - Liste/Cards mit Checkboxes
   - Multi-Select möglich
   - Preview der wichtigsten Daten
   
4. **Import Action**
   - Speichert ausgewählte Positionen in DB
   - Progress Indicator während Import

### Option 3: NFT Import
**NFT Import Flow:**

1. **NFT ID Input**
   - Input Field für Token ID
   - Validierung Format
   
2. **Position Fetch**
   - Contract Call zum NFT Manager
   - Abruf der Position Details
   
3. **Preview & Confirm**
   - Zeige Position Details
   - Confirm Import Button
   
4. **Speicherung**
   - In DB mit NFT Referenz

## Phase 4: API Routes

### `/api/positions`
- **GET**: Alle Positionen des Users (mit Pool-Daten)
  - Automatisches `include: { pool: true }` für vollständige Daten
- **POST**: Neue Position erstellen
  - Pool automatisch anlegen falls nicht vorhanden
- **PUT**: Position aktualisieren
- **DELETE**: Position entfernen

### `/api/tokens`
- **GET**: Token-Daten abrufen
  - Query Parameter: chain, address oder symbol
- **POST**: Token anlegen/aktualisieren
  - Automatisch beim Pool-Import

### `/api/tokens/search`
- **GET**: Token suchen
  - Query Parameter: chain, query (Symbol oder Name)
  - Für Autocomplete in UI

### `/api/pools`
- **GET**: Pool-Daten abrufen (mit Token-Relationen)
  - Query Parameter: chain, poolAddress
  - Automatisches `include: { token0: true, token1: true }`
- **POST**: Pool anlegen/aktualisieren
  - Tokens werden automatisch angelegt falls nicht vorhanden

### `/api/pools/search`
- **GET**: Pools für Token-Pair suchen
  - Query Parameter: chain, token0, token1
  - Gibt alle Fee Tiers zurück (0.01%, 0.05%, 0.3%, 1%)

### `/api/pools/update`
- **POST**: Pool-Statistiken aktualisieren
  - TVL, Volume, APR, Current Price
  - Kann als Cron-Job laufen

### `/api/tokens/refresh-metadata`
- **POST**: Token-Metadata aktualisieren
  - Logos und Metadaten von Alchemy
  - Batch-Update für veraltete Tokens

### `/api/uniswap/import-wallet`
- **POST**: Import Positionen von Wallet
- Body: walletAddress, chain
- Legt automatisch benötigte Pools an

### `/api/uniswap/import-nft`
- **POST**: Import Position von NFT
- Body: nftId, chain
- Pool wird automatisch angelegt/verknüpft

## Phase 5: Alchemy Token API Integration

### Token Metadata Service mit Alchemy

**Alchemy bietet hochwertige Token-Metadaten:**
- Verifizierte Token-Logos
- Symbol, Name, Decimals
- Spam-Token Erkennung
- Batch-Operationen für Effizienz

### Implementation Strategy

```typescript
// src/services/alchemy/tokenMetadata.ts
export class AlchemyTokenService {
  private alchemyUrls: Record<string, string>;
  
  constructor() {
    this.alchemyUrls = {
      ethereum: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY_ETHEREUM}`,
      arbitrum: `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY_ARBITRUM}`,
      base: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY_BASE}`,
    };
  }
  
  // Einzelner Token
  async getTokenMetadata(chain: string, address: string) {
    const response = await fetch(this.alchemyUrls[chain], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'alchemy_getTokenMetadata',
        params: [address],
        id: 1
      })
    });
    
    return response.json();
    // Returns: { symbol, name, decimals, logo }
  }
  
  // Batch für mehrere Tokens (bis zu 100)
  async getTokenMetadataBatch(chain: string, addresses: string[]) {
    const response = await fetch(this.alchemyUrls[chain], {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'alchemy_getTokenMetadataBatch',
        params: [addresses],
        id: 1
      })
    });
    
    return response.json();
  }
  
  // Mit DB Cache - Read-Through Pattern
  async getOrFetchTokenMetadata(chain: string, address: string) {
    // 1. Check DB first
    const existingToken = await prisma.token.findUnique({
      where: { chain_address: { chain, address } }
    });
    
    if (existingToken && existingToken.logoUrl) {
      return existingToken;
    }
    
    // 2. Fetch from Alchemy
    const metadata = await this.getTokenMetadata(chain, address);
    
    // 3. Upsert in DB
    const token = await prisma.token.upsert({
      where: { chain_address: { chain, address } },
      update: {
        symbol: metadata.symbol,
        name: metadata.name,
        decimals: metadata.decimals,
        logoUrl: metadata.logo,
        verified: true,
        lastUpdatedAt: new Date()
      },
      create: {
        chain,
        address,
        symbol: metadata.symbol,
        name: metadata.name,
        decimals: metadata.decimals,
        logoUrl: metadata.logo,
        verified: true
      }
    });
    
    return token;
  }
}
```

### Environment Variables

```env
# Alchemy API Keys (one per chain)
ALCHEMY_API_KEY_ETHEREUM=your-ethereum-key
ALCHEMY_API_KEY_ARBITRUM=your-arbitrum-key
ALCHEMY_API_KEY_BASE=your-base-key
```

### Integration Points

1. **NFT Import Flow:**
   - Position von Contract holen → Token Addresses extrahieren
   - Alchemy Batch Request für beide Tokens
   - Tokens in DB speichern mit Logo
   - Pool und Position anlegen

2. **Manual Position Creation:**
   - Token-Suche zeigt Logo im Dropdown
   - Bei Auswahl: Metadata von Alchemy falls nicht in DB
   - Visuelles Feedback mit Token-Logo

3. **Position List Display:**
   - Token-Logos direkt aus DB
   - Kein zusätzlicher API Call nötig
   - Fallback auf generisches Icon

### Error Handling

```typescript
// Fallback-Strategie ohne externe Preis-APIs:
1. Alchemy API → Primary source für Metadata
2. On-chain fallback → Minimal data (symbol, decimals via Contract)
3. Generic Icon → Wenn kein Logo verfügbar
4. Manual Entry → User kann Token-Info manuell eingeben
```

## Phase 6: Uniswap V3 Integration

### Required Packages (Aktuell verwendet)
```json
{
  "viem": "^2.37.3",          // ✅ BEREITS INSTALLIERT - Für Contract Calls
  "wagmi": "^2.16.9",         // ✅ BEREITS INSTALLIERT - Web3 React Hooks
  "@uniswap/v3-sdk": "^3.x",  // 🔄 TODO - Für Position Berechnungen
  "@uniswap/sdk-core": "^4.x" // 🔄 TODO - Für Tick Math und Price Calculations
}
```

### Integration Points
1. **Uniswap V3 SDK**
   - Position Berechnungen
   - Tick Math
   - Price Calculations
   
2. **Subgraph Queries**
   - Pool Discovery
   - Historical Data
   - Position Details
   
3. **Contract Calls**
   - ✅ NFT Position Manager (IMPLEMENTIERT mit viem)
   - 🔄 Pool Contract Reads
   
4. **Price Feeds**
   - Current Prices
   - Historical Prices

## Phase 6: UI Components Struktur

### Neue Komponenten
```
src/components/positions/
├── position-list.tsx           # Hauptliste
├── position-card.tsx           # Einzelne Position Card
├── create-position-dropdown.tsx # Dropdown Menü
├── modals/
│   ├── manual-position-modal.tsx
│   ├── wallet-import-modal.tsx
│   └── nft-import-modal.tsx
└── forms/
    ├── token-selector.tsx      # Token Autocomplete
    ├── pool-selector.tsx       # Pool Auswahl
    └── range-input.tsx         # Range Configuration
```

## Phase 7: Localization Updates

### Neue Translation Keys

**Deutsch (`messages/de.json`):**
```json
{
  "dashboard": {
    "title": "Eure Positionen",
    "emptyState": "Noch keine Positionen vorhanden",
    "addPosition": "Position hinzufügen",
    "manualCreate": "Manuell konfigurieren",
    "walletImport": "Aus Wallet importieren",
    "nftImport": "NFT Position importieren"
  },
  "position": {
    "tokenPair": "Token Paar",
    "chain": "Chain",
    "currentValue": "Aktueller Wert",
    "pnl": "Gewinn/Verlust",
    "apr": "APR",
    "inRange": "Im Bereich",
    "outOfRange": "Außerhalb"
  }
}
```

**English (`messages/en.json`):**
```json
{
  "dashboard": {
    "title": "Your Positions",
    "emptyState": "No positions yet",
    "addPosition": "Add Position",
    "manualCreate": "Configure Manually",
    "walletImport": "Import from Wallet",
    "nftImport": "Import NFT Position"
  },
  "position": {
    "tokenPair": "Token Pair",
    "chain": "Chain",
    "currentValue": "Current Value",
    "pnl": "Profit/Loss",
    "apr": "APR",
    "inRange": "In Range",
    "outOfRange": "Out of Range"
  }
}
```

## Implementierungs-Reihenfolge

1. ✅ **Dashboard Page** → Basic Layout (ABGESCHLOSSEN)
2. ✅ **Create Dropdown** → UI Only (ABGESCHLOSSEN)
3. ✅ **NFT Import Form** → Inline Form im Dropdown (ABGESCHLOSSEN)
4. ✅ **Localization** → Vollständige Mehrsprachigkeit DE/EN (ABGESCHLOSSEN)
5. ✅ **Component Extraction** → CreatePositionDropdown als separate Komponente (ABGESCHLOSSEN)
6. ✅ **NFT Import** → Contract Integration (ABGESCHLOSSEN)
7. ✅ **Database Schema** → Token, Pool & Position Models mit Relations (ABGESCHLOSSEN)
8. ✅ **Testing Setup** → Vitest konfiguriert, MSW Mock Server (ABGESCHLOSSEN)
9. ✅ **Token Service** → Alchemy Integration & Business Logic (ABGESCHLOSSEN)
10. ✅ **Token API Routes** → CRUD Operations für Tokens (ABGESCHLOSSEN)
11. 🔄 **Pool Service** → Pool-Daten von Uniswap abrufen (NÄCHSTER SCHRITT)
12. 🔄 **Position List** → Mit echten Daten aus DB
13. 🔄 **Manual Creation** → Token-Auswahl und Pool-Konfiguration
14. 🔄 **Wallet Import** → Subgraph Integration
15. 🔄 **Background Jobs** → Pool-Statistiken Updates
16. 🔄 **Polish** → Error Handling, Loading States, Performance

## ✅ AKTUELLE IMPLEMENTATION (Stand: Token-Integration Komplett)

### Database & Schema
- **✅ Prisma Schema** mit Token, Pool & Position Models
- **✅ Vollständig normalisiert**: Token → Pool → Position Hierarchie
- **✅ Migrations** erstellt und angewendet (PostgreSQL)
- **✅ Test Database** Setup mit separater duncan_test DB

### Testing Infrastructure
- **✅ Vitest** konfiguriert mit jsdom Environment
- **✅ MSW Mock Server** für Alchemy API Simulation
- **✅ 51 Unit Tests** mit 100% Pass Rate:
  - 20 Tests für AlchemyTokenService
  - 31 Tests für TokenService
- **✅ Test Fixtures** mit realistischen Token-Daten
- **✅ Test Utils** für Request Mocking

### Token Management System
**✅ AlchemyTokenService** - Alchemy Token API Integration:
- Single Token Metadata Abruf (`alchemy_getTokenMetadata`)
- Batch Token Abruf (bis zu 100 Tokens per Request)
- Case-insensitive Address Handling
- Comprehensive Error Handling & Rate Limiting
- Support für Ethereum, Arbitrum, Base

**✅ TokenService** - Business Logic Layer:
- `findOrCreateToken()` - Alchemy Integration mit DB Cache
- `searchTokens()` - Token Suche mit Filtering (Symbol, Name, Chain)
- `createTokensFromAddresses()` - Batch Token Creation
- `upsertToken()` - Create/Update Operations
- Metadata Refresh System für veraltete Daten

### Token API Routes
**✅ GET/POST `/api/tokens`** - Einzelne Token Operations:
- Token abrufen nach Chain & Address
- Token erstellen/aktualisieren mit Validation

**✅ GET `/api/tokens/search`** - Token Suche:
- Query-basierte Suche (Symbol/Name)
- Chain Filtering
- Verified-Only Option
- Pagination (limit/offset)

**✅ GET/POST `/api/tokens/batch`** - Batch Operations:
- Mehrere Tokens gleichzeitig abrufen/erstellen
- Automatische Alchemy Integration
- Limit: 100 Tokens per Request

### Environment Configuration
- **✅ ALCHEMY_TOKEN_API_KEY** für Token Metadata API
- **✅ .env.example** mit allen benötigten Keys
- **✅ Test Environment** Setup

### Dashboard (`/dashboard`)
- **Protected Route** mit NextAuth Authentication Check
- **Header** mit DUNCAN Titel, User Dropdown, Settings Modal
- **Vollständig mehrsprachig** (DE/EN) mit next-intl
- **Empty State** mit Emoji und beschreibendem Text
- **Responsive Design** mit dark theme

### CreatePositionDropdown Komponente
- **Separate Komponente** in `/src/components/positions/create-position-dropdown.tsx`
- **Drei Optionen** mit Beschreibungen:
  - Manuell konfigurieren (TODO: Modal öffnen)
  - Aus Wallet importieren (TODO: Modal öffnen)  
  - NFT Position importieren (✅ Vollständig implementiert)
- **NFT Import** - Komplette Blockchain-Integration:
  - Blockchain Dropdown (Ethereum, Arbitrum, Base)
  - NFT ID Input (8 Zeichen, validiert)
  - Import Button mit Loading States
  - Direkte Contract-Calls über NonfungiblePositionManager
  - Error Handling und Success Messages
  - Position Preview mit Token-Adressen und Fee-Tier
- **✅ Ready für Token Integration** - Kann jetzt echte Token-Daten laden

### Localization
- **Deutsche Übersetzungen** in `/src/messages/de.json`
- **Englische Übersetzungen** in `/src/messages/en.json`
- **Dashboard-spezifische Keys** hinzugefügt:
  - `dashboard.title`, `dashboard.subtitle`
  - `dashboard.emptyState.*`
  - `dashboard.addPosition.*` (mit Unterstrukturen)

### Dateien erstellt/geändert:
**Frontend & UI:**
- ✅ `src/app/dashboard/page.tsx` - Dashboard Seite
- ✅ `src/components/positions/create-position-dropdown.tsx` - Dropdown Komponente  
- ✅ `src/messages/de.json` - Deutsche Übersetzungen
- ✅ `src/messages/en.json` - Englische Übersetzungen

**Database & Schema:**
- ✅ `prisma/schema.prisma` - Token, Pool, Position Models
- ✅ `prisma/migrations/` - Database Migrations

**Token Management Services:**
- ✅ `src/services/alchemy/tokenMetadata.ts` - Alchemy Token API Service
- ✅ `src/services/alchemy/tokenMetadata.test.ts` - 20 Unit Tests
- ✅ `src/services/tokens/tokenService.ts` - Token Business Logic
- ✅ `src/services/tokens/tokenService.test.ts` - 31 Unit Tests

**API Routes:**
- ✅ `src/app/api/tokens/route.ts` - GET/POST Token Operations
- ✅ `src/app/api/tokens/search/route.ts` - Token Search API
- ✅ `src/app/api/tokens/batch/route.ts` - Batch Token Operations
- ✅ `src/app/api/positions/import-nft/route.ts` - NFT Import API

**Testing Infrastructure:**
- ✅ `vitest.config.ts` - Test Framework Configuration
- ✅ `src/__tests__/setup.ts` - Test Environment Setup
- ✅ `src/__tests__/mocks/server.ts` - MSW Mock Server
- ✅ `src/__tests__/mocks/handlers.ts` - Alchemy API Mocks
- ✅ `src/__tests__/fixtures/tokens.ts` - Test Token Data
- ✅ `src/__tests__/fixtures/alchemy.ts` - Mock Alchemy Responses
- ✅ `src/__tests__/utils/testRequest.ts` - HTTP Test Utils

**Blockchain Integration:**
- ✅ `src/lib/contracts/nonfungiblePositionManager.ts` - Contract ABIs und Adressen
- ✅ `src/services/uniswap/nftPosition.ts` - NFT Position Fetching Service

**Configuration:**
- ✅ `.env.example` - Environment Variables mit ALCHEMY_TOKEN_API_KEY
- ✅ `package.json` - Test Scripts und Dependencies

### NFT Import - Technische Implementation
**Vollständige Blockchain-Integration implementiert:**

- **Contract Konfiguration:**
  - NonfungiblePositionManager Adressen für alle Chains:
    - Ethereum: `0xC36442b4a4522E871399CD717aBDD847Ab11FE88`
    - Arbitrum: `0xC36442b4a4522E871399CD717aBDD847Ab11FE88` 
    - Base: `0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1`
  - Minimale ABI nur für `positions()` Funktion
  - TypeScript Types für alle Return Values

- **Blockchain Service:**
  - Direkte Contract-Calls mit viem (statt ethers)
  - Error Handling für nicht-existente NFTs
  - Position Parsing mit allen relevanten Daten:
    - Token0/Token1 Adressen
    - Fee Tier (0.01%, 0.05%, 0.3%, 1%)
    - Tick Range (tickLower, tickUpper)
    - Current Liquidity
    - Owed Fees (tokensOwed0, tokensOwed1)

- **API Integration:**
  - POST `/api/positions/import-nft`
  - Input Validierung (chain, nftId)
  - Strukturierte Error Messages
  - JSON Response mit vollständigen Position-Daten

- **Frontend Features:**
  - Loading States mit Spinner Animation
  - Error Messages mit spezifischen Fehlern
  - Success Preview mit Token-Adressen und Fee-Anzeige
  - Auto-Reset nach erfolgreichem Import
  - TypeScript-typisierte API-Calls

## Phase 7: Testing Strategy

### Test Framework: Vitest
- Schneller als Jest mit nativer ESM Support
- TypeScript-ready out of the box
- Kompatibel mit Next.js 15

### Test-Struktur
```
src/
├── services/
│   ├── alchemy/
│   │   ├── tokenMetadata.ts
│   │   └── tokenMetadata.test.ts
│   └── tokens/
│       ├── tokenService.ts
│       └── tokenService.test.ts
├── app/api/tokens/
│   ├── route.ts
│   └── route.test.ts
└── __tests__/
    ├── fixtures/
    │   ├── tokens.ts        # Mock Token Daten
    │   └── alchemy.ts       # Alchemy Response Mocks
    └── integration/
        └── token-import.test.ts
```

### Unit Tests für AlchemyTokenService
- Token Metadata fetching von Alchemy API
- Batch Operations (bis zu 100 Tokens)
- Caching-Strategie mit DB
- Error Handling und Rate Limits

### Unit Tests für Token Service
- Find or Create Token Logic
- Token Metadata Updates
- Token Search Functionality
- Chain Validation

### API Route Tests
- GET /api/tokens - Token abrufen
- POST /api/tokens - Token erstellen
- GET /api/tokens/search - Token suchen
- Parameter Validation

### Integration Tests
- Complete Token Import Flow
- NFT Position Import mit Token Creation
- Alchemy API Fallback Handling

### Mock Data & Fixtures
```typescript
// Beispiel Mock Tokens
export const mockTokens = {
  WETH: {
    chain: 'ethereum',
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    logoUrl: 'https://...',
    verified: true
  },
  USDC: {
    chain: 'ethereum', 
    address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoUrl: 'https://...',
    verified: true
  }
}
```

### Test Dependencies
```json
{
  "devDependencies": {
    "vitest": "^2.0.0",
    "@vitest/ui": "^2.0.0",
    "@testing-library/react": "^16.0.0",
    "msw": "^2.0.0"  // API Mocking
  }
}
```

### Testing Best Practices
- Mocking Alchemy API (keine echten API Calls)
- Separate Test Database (SQLite)
- Parallel Test Execution
- After-Hooks für Cleanup
- Coverage Goal: 80%+

## Offene Fragen / Zu klären

1. **Pool Discovery**: Direkt von Chain oder via API Service?
2. **Historical Data**: Eigene Indexierung oder Subgraph only?
3. **Price Updates**: WebSocket oder Polling?
4. **Position Tracking**: Real-time oder on-demand?
5. **Fee Calculation**: Simplified oder exact Math?

## Notizen

- Initial Implementation mit Mock Data starten
- Schrittweise Integration der Uniswap SDK
- Mobile-First Design beachten
- Error States und Loading States von Anfang an
- Typescript Types für alle Uniswap Interactions