import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity contract environment
const mockContractState = {
  admin: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  providers: new Map(),
  constants: {
    STATUS_PENDING: 0,
    STATUS_VERIFIED: 1,
    STATUS_REVOKED: 2
  }
};

// Mock contract functions
const mockContract = {
  registerProvider: (sender, name, licenseNumber, specialty) => {
    if (mockContractState.providers.has(sender)) {
      return { type: 'err', value: 1 };
    }
    
    mockContractState.providers.set(sender, {
      name,
      'license-number': licenseNumber,
      specialty,
      status: mockContractState.constants.STATUS_PENDING,
      'verification-date': 0
    });
    
    return { type: 'ok', value: true };
  },
  
  verifyProvider: (sender, providerAddress) => {
    if (sender !== mockContractState.admin) {
      return { type: 'err', value: 403 };
    }
    
    if (!mockContractState.providers.has(providerAddress)) {
      return { type: 'err', value: 404 };
    }
    
    const provider = mockContractState.providers.get(providerAddress);
    provider.status = mockContractState.constants.STATUS_VERIFIED;
    provider['verification-date'] = 123; // Mock block height
    mockContractState.providers.set(providerAddress, provider);
    
    return { type: 'ok', value: true };
  },
  
  revokeProvider: (sender, providerAddress) => {
    if (sender !== mockContractState.admin) {
      return { type: 'err', value: 403 };
    }
    
    if (!mockContractState.providers.has(providerAddress)) {
      return { type: 'err', value: 404 };
    }
    
    const provider = mockContractState.providers.get(providerAddress);
    provider.status = mockContractState.constants.STATUS_REVOKED;
    provider['verification-date'] = 123; // Mock block height
    mockContractState.providers.set(providerAddress, provider);
    
    return { type: 'ok', value: true };
  },
  
  isVerifiedProvider: (providerAddress) => {
    if (!mockContractState.providers.has(providerAddress)) {
      return false;
    }
    
    const provider = mockContractState.providers.get(providerAddress);
    return provider.status === mockContractState.constants.STATUS_VERIFIED;
  },
  
  getProviderDetails: (providerAddress) => {
    if (!mockContractState.providers.has(providerAddress)) {
      return null;
    }
    
    return mockContractState.providers.get(providerAddress);
  },
  
  transferAdmin: (sender, newAdmin) => {
    if (sender !== mockContractState.admin) {
      return { type: 'err', value: 403 };
    }
    
    mockContractState.admin = newAdmin;
    return { type: 'ok', value: true };
  }
};

describe('Provider Verification Contract', () => {
  beforeEach(() => {
    // Reset the contract state before each test
    mockContractState.providers.clear();
    mockContractState.admin = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
  });
  
  it('should allow a provider to register', () => {
    const result = mockContract.registerProvider(
        'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
        'Dr. Smith',
        'MD12345',
        'Cardiology'
    );
    
    expect(result.type).toBe('ok');
    expect(mockContractState.providers.has('ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG')).toBe(true);
    
    const provider = mockContractState.providers.get('ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG');
    expect(provider.name).toBe('Dr. Smith');
    expect(provider['license-number']).toBe('MD12345');
    expect(provider.specialty).toBe('Cardiology');
    expect(provider.status).toBe(mockContractState.constants.STATUS_PENDING);
  });
  
  it('should not allow a provider to register twice', () => {
    mockContract.registerProvider(
        'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
        'Dr. Smith',
        'MD12345',
        'Cardiology'
    );
    
    const result = mockContract.registerProvider(
        'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
        'Dr. Smith',
        'MD12345',
        'Cardiology'
    );
    
    expect(result.type).toBe('err');
    expect(result.value).toBe(1);
  });
  
  it('should allow admin to verify a provider', () => {
    mockContract.registerProvider(
        'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
        'Dr. Smith',
        'MD12345',
        'Cardiology'
    );
    
    const result = mockContract.verifyProvider(
        mockContractState.admin,
        'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG'
    );
    
    expect(result.type).toBe('ok');
    
    const provider = mockContractState.providers.get('ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG');
    expect(provider.status).toBe(mockContractState.constants.STATUS_VERIFIED);
    expect(provider['verification-date']).toBe(123);
  });
  
  it('should not allow non-admin to verify a provider', () => {
    mockContract.registerProvider(
        'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
        'Dr. Smith',
        'MD12345',
        'Cardiology'
    );
    
    const result = mockContract.verifyProvider(
        'ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5YC7WF3TA',
        'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG'
    );
    
    expect(result.type).toBe('err');
    expect(result.value).toBe(403);
  });
  
  it('should correctly identify verified providers', () => {
    mockContract.registerProvider(
        'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
        'Dr. Smith',
        'MD12345',
        'Cardiology'
    );
    
    expect(mockContract.isVerifiedProvider('ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG')).toBe(false);
    
    mockContract.verifyProvider(
        mockContractState.admin,
        'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG'
    );
    
    expect(mockContract.isVerifiedProvider('ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG')).toBe(true);
  });
  
  it('should allow admin to revoke a provider', () => {
    mockContract.registerProvider(
        'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG',
        'Dr. Smith',
        'MD12345',
        'Cardiology'
    );
    
    mockContract.verifyProvider(
        mockContractState.admin,
        'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG'
    );
    
    const result = mockContract.revokeProvider(
        mockContractState.admin,
        'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG'
    );
    
    expect(result.type).toBe('ok');
    
    const provider = mockContractState.providers.get('ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG');
    expect(provider.status).toBe(mockContractState.constants.STATUS_REVOKED);
  });
  
  it('should allow admin to transfer admin rights', () => {
    const newAdmin = 'ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5YC7WF3TA';
    
    const result = mockContract.transferAdmin(
        mockContractState.admin,
        newAdmin
    );
    
    expect(result.type).toBe('ok');
    expect(mockContractState.admin).toBe(newAdmin);
  });
});
