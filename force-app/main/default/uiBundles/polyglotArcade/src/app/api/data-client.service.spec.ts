import { TestBed } from '@angular/core/testing';
import { DataClient } from './data-client.service';
import { createDataSDK } from '@salesforce/platform-sdk';

vi.mock('@salesforce/platform-sdk', () => ({
	createDataSDK: vi.fn(),
}));

describe('DataClient', () => {
	let service: DataClient;
	let mockGraphqlQuery: ReturnType<typeof vi.fn>;
	let mockGraphqlMutate: ReturnType<typeof vi.fn>;
	let mockFetch: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		mockGraphqlQuery = vi.fn();
		mockGraphqlMutate = vi.fn();
		mockFetch = vi.fn();

		vi.mocked(createDataSDK).mockResolvedValue({
			graphql: {
				query: mockGraphqlQuery,
				mutate: mockGraphqlMutate,
			},
			fetch: mockFetch,
		} as any);

		await TestBed.configureTestingModule({
			providers: [DataClient],
		}).compileComponents();

		service = TestBed.inject(DataClient);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should create the service', () => {
		expect(service).toBeTruthy();
		expect(service).toBeInstanceOf(DataClient);
	});

	it('should route plain query operations to graphql.query and return result.data', async () => {
		const operation = 'query { user { id name } }';
		const expectedData = { user: { id: '123', name: 'Test User' } };
		mockGraphqlQuery.mockResolvedValue({ data: expectedData });

		const result = await service.execute(operation);

		expect(mockGraphqlQuery).toHaveBeenCalledWith({ query: operation, variables: undefined });
		expect(mockGraphqlMutate).not.toHaveBeenCalled();
		expect(result).toEqual(expectedData);
	});

	it('should route anonymous query operations to graphql.query', async () => {
		const operation = '{ user { id name } }';
		const expectedData = { user: { id: '456', name: 'Anonymous User' } };
		mockGraphqlQuery.mockResolvedValue({ data: expectedData });

		const result = await service.execute(operation);

		expect(mockGraphqlQuery).toHaveBeenCalledWith({ query: operation, variables: undefined });
		expect(mockGraphqlMutate).not.toHaveBeenCalled();
		expect(result).toEqual(expectedData);
	});

	it('should route mutation operations to graphql.mutate', async () => {
		const operation = 'mutation { updateUser(id: "123", name: "New Name") { id name } }';
		const expectedData = { updateUser: { id: '123', name: 'New Name' } };
		mockGraphqlMutate.mockResolvedValue({ data: expectedData });

		const result = await service.execute(operation);

		expect(mockGraphqlMutate).toHaveBeenCalledWith({ mutation: operation, variables: undefined });
		expect(mockGraphqlQuery).not.toHaveBeenCalled();
		expect(result).toEqual(expectedData);
	});

	it('should detect mutation with leading GraphQL comment and route to graphql.mutate', async () => {
		const operation = '# This is a comment\nmutation { deleteUser(id: "123") { success } }';
		const expectedData = { deleteUser: { success: true } };
		mockGraphqlMutate.mockResolvedValue({ data: expectedData });

		const result = await service.execute(operation);

		expect(mockGraphqlMutate).toHaveBeenCalledWith({ mutation: operation, variables: undefined });
		expect(mockGraphqlQuery).not.toHaveBeenCalled();
		expect(result).toEqual(expectedData);
	});

	it('should not treat query as mutation when comment contains "mutation" word', async () => {
		const operation = '# this is not a mutation, just a query\nquery { user { id } }';
		const expectedData = { user: { id: '789' } };
		mockGraphqlQuery.mockResolvedValue({ data: expectedData });

		const result = await service.execute(operation);

		expect(mockGraphqlQuery).toHaveBeenCalledWith({ query: operation, variables: undefined });
		expect(mockGraphqlMutate).not.toHaveBeenCalled();
		expect(result).toEqual(expectedData);
	});

	it('should throw error when result.errors contains errors', async () => {
		const operation = 'query { user { id } }';
		mockGraphqlQuery.mockResolvedValue({
			data: null,
			errors: [{ message: 'Field not found' }, { message: 'Permission denied' }],
		});

		await expect(service.execute(operation)).rejects.toThrow(
			'GraphQL Error: Field not found; Permission denied',
		);
	});

	it('should throw error when result.errors contains a single error', async () => {
		const operation = 'query { user { id } }';
		mockGraphqlQuery.mockResolvedValue({
			data: null,
			errors: [{ message: 'Unauthorized' }],
		});

		await expect(service.execute(operation)).rejects.toThrow('GraphQL Error: Unauthorized');
	});

	it('should throw error when result.data is null with no errors', async () => {
		const operation = 'query { user { id } }';
		mockGraphqlQuery.mockResolvedValue({ data: null });

		await expect(service.execute(operation)).rejects.toThrow('GraphQL response data is null');
	});

	it('should pass variables through to graphql.query', async () => {
		const operation = 'query GetUser($id: ID!) { user(id: $id) { id name } }';
		const variables = { id: '999' };
		const expectedData = { user: { id: '999', name: 'Variable User' } };
		mockGraphqlQuery.mockResolvedValue({ data: expectedData });

		const result = await service.execute(operation, variables);

		expect(mockGraphqlQuery).toHaveBeenCalledWith({ query: operation, variables });
		expect(result).toEqual(expectedData);
	});

	it('should pass variables through to graphql.mutate', async () => {
		const operation =
			'mutation UpdateUser($id: ID!, $name: String!) { updateUser(id: $id, name: $name) { id name } }';
		const variables = { id: '888', name: 'Updated Name' };
		const expectedData = { updateUser: { id: '888', name: 'Updated Name' } };
		mockGraphqlMutate.mockResolvedValue({ data: expectedData });

		const result = await service.execute(operation, variables);

		expect(mockGraphqlMutate).toHaveBeenCalledWith({ mutation: operation, variables });
		expect(result).toEqual(expectedData);
	});

	it('should proxy fetch to sdk.fetch and return the raw Response', async () => {
		const url = '/services/apexrest/auth/login';
		const init: RequestInit = {
			method: 'POST',
			body: JSON.stringify({ email: 'a@b.com' }),
			headers: { 'Content-Type': 'application/json' },
		};
		const expectedResponse = { ok: true, status: 200 } as Response;
		mockFetch.mockResolvedValue(expectedResponse);

		const response = await service.fetch(url, init);

		expect(mockFetch).toHaveBeenCalledWith(url, init);
		expect(response).toBe(expectedResponse);
	});

	it('should call fetch with no init when omitted', async () => {
		const url = '/services/data/v64.0/chatter/users/me';
		const expectedResponse = { ok: true, status: 200 } as Response;
		mockFetch.mockResolvedValue(expectedResponse);

		const response = await service.fetch(url);

		expect(mockFetch).toHaveBeenCalledWith(url, undefined);
		expect(response).toBe(expectedResponse);
	});
});
