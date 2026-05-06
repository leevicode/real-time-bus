import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import AdmZip from 'adm-zip';
import { fetchGftsData } from '../staticGtfsIngestion';

vi.mock('axios');

vi.mock('adm-zip', () => {
  return {
    default: vi.fn()
  };
});

describe('staticGtfsIngestion', () => {
  const mockAuthority = 'jyvaskyla';
  const mockUrl = `https://tvv.fra1.digitaloceanspaces.com/${mockAuthority}.zip`;

  let mockZipInstance: any;

  beforeEach(() => {
    vi.resetAllMocks();

    mockZipInstance = {
      getEntry: vi.fn(),
      getData: vi.fn()
    };

    vi.mocked(AdmZip).mockImplementation(function () {
      return mockZipInstance;
    });
  });

  it('should fetch zip and parse CSV content correctly', async () => {
    const mockBuffer = Buffer.from('fake-zip-content');
    (axios.get as any).mockResolvedValue({ data: mockBuffer });

    const csvContent = 'stop_id,stop_name\n1,Keskusta\n2,Sairaala';
    const mockEntry = {
      getData: vi.fn().mockReturnValue(Buffer.from(csvContent))
    };

    mockZipInstance.getEntry.mockReturnValue(mockEntry);

    const zip = await fetchGftsData(mockAuthority);

    expect(axios.get).toHaveBeenCalledWith(mockUrl, { responseType: 'arraybuffer' });

    const result = await zip.parse<any[]>('stops.txt');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ stop_id: '1', stop_name: 'Keskusta' });
    expect(mockZipInstance.getEntry).toHaveBeenCalledWith('stops.txt');
  });

  it('should return null if file is missing in zip', async () => {
    (axios.get as any).mockResolvedValue({ data: Buffer.from('...') });
    
    mockZipInstance.getEntry.mockReturnValue(null);

    const zip = await fetchGftsData(mockAuthority);
    const result = await zip.parse('non-existent.txt');

    expect(result).toBeNull();
  });

  it('should use caching, second call to parse should not re-read data', async () => {
    (axios.get as any).mockResolvedValue({ data: Buffer.from('...') });
    
    const mockEntry = {
      getData: vi.fn().mockReturnValue(Buffer.from('id\n1'))
    };
    mockZipInstance.getEntry.mockReturnValue(mockEntry);

    const zip = await fetchGftsData(mockAuthority);

    await zip.parse('data.txt');
    await zip.parse('data.txt');

    expect(mockZipInstance.getEntry).toHaveBeenCalledTimes(1);
  });

  it('should throw error if axios fetch fails', async () => {
    (axios.get as any).mockRejectedValue(new Error('Network Error'));

    await expect(fetchGftsData(mockAuthority)).rejects.toThrow('Network Error');
  });
});