export type SchoolInfo = {
  schoolCode: string
  schoolName: string
  region: string
  address: string
}

const SAMPLE_SCHOOLS: SchoolInfo[] = [
  {
    schoolCode: 'B100000001',
    schoolName: '서울아바다고등학교',
    region: '서울특별시',
    address: '서울특별시 종로구 샘플로 1',
  },
  {
    schoolCode: 'B100000002',
    schoolName: '서울초록초등학교',
    region: '서울특별시',
    address: '서울특별시 강남구 에코길 12',
  },
  {
    schoolCode: 'B100000003',
    schoolName: '부산나눔초등학교',
    region: '부산광역시',
    address: '부산광역시 해운대구 나눔로 8',
  },
  {
    schoolCode: 'B100000004',
    schoolName: '인천햇살초등학교',
    region: '인천광역시',
    address: '인천광역시 연수구 햇살길 3',
  },
  {
    schoolCode: 'B100000005',
    schoolName: '대전친구초등학교',
    region: '대전광역시',
    address: '대전광역시 유성구 친구로 21',
  },
  {
    schoolCode: 'B100000006',
    schoolName: '광주무지개초등학교',
    region: '광주광역시',
    address: '광주광역시 서구 무지개길 5',
  },
  {
    schoolCode: 'B100000007',
    schoolName: '대구별빛초등학교',
    region: '대구광역시',
    address: '대구광역시 수성구 별빛로 9',
  },
  {
    schoolCode: 'B100000008',
    schoolName: '울산바다초등학교',
    region: '울산광역시',
    address: '울산광역시 남구 바다길 17',
  },
]

function filterSamples(query: string): SchoolInfo[] {
  const q = query.trim().toLowerCase()
  if (!q) return SAMPLE_SCHOOLS.slice(0, 5)
  return SAMPLE_SCHOOLS.filter(
    (s) =>
      s.schoolName.toLowerCase().includes(q) ||
      s.region.toLowerCase().includes(q) ||
      s.address.toLowerCase().includes(q),
  )
}

export async function searchSchools(
  query: string,
  apiKey?: string,
): Promise<{ schools: SchoolInfo[]; source: 'neis' | 'sample' }> {
  const trimmed = query.trim()
  if (!trimmed) {
    return { schools: SAMPLE_SCHOOLS.slice(0, 5), source: 'sample' }
  }

  const key = apiKey?.trim()
  if (!key || key === 'SAMPLE' || key === 'sample') {
    return { schools: filterSamples(trimmed), source: 'sample' }
  }

  try {
    const url = new URL('https://open.neis.go.kr/hub/schoolInfo')
    url.searchParams.set('KEY', key)
    url.searchParams.set('Type', 'json')
    url.searchParams.set('pIndex', '1')
    url.searchParams.set('pSize', '20')
    url.searchParams.set('SCHUL_NM', trimmed)
    url.searchParams.set('SCHUL_KND_SC_NM', '초등학교')

    const res = await fetch(url.toString())
    if (!res.ok) {
      return { schools: filterSamples(trimmed), source: 'sample' }
    }

    const data = (await res.json()) as {
      schoolInfo?: Array<{
        head?: Array<{ RESULT?: { CODE?: string; MESSAGE?: string } }>
        row?: Array<{
          SD_SCHUL_CODE?: string
          SCHUL_NM?: string
          ORG_RDNMA?: string
          LCTN_SC_NM?: string
          ATPT_OFCDC_SC_NM?: string
        }>
      }>
      RESULT?: { CODE?: string; MESSAGE?: string }
    }

    const resultCode =
      data.RESULT?.CODE || data.schoolInfo?.[0]?.head?.[0]?.RESULT?.CODE || ''
    const rows = data.schoolInfo?.[1]?.row

    if (!rows?.length || (resultCode && resultCode !== 'INFO-000')) {
      return { schools: filterSamples(trimmed), source: 'sample' }
    }

    const schools: SchoolInfo[] = rows.map((row) => ({
      schoolCode: row.SD_SCHUL_CODE || '',
      schoolName: row.SCHUL_NM || '',
      region: row.LCTN_SC_NM || row.ATPT_OFCDC_SC_NM || '',
      address: row.ORG_RDNMA || '',
    }))

    return { schools, source: 'neis' }
  } catch {
    return { schools: filterSamples(trimmed), source: 'sample' }
  }
}
