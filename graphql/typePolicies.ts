import { TypePolicies } from '@apollo/client'
import type { StrictTypedTypePolicies } from 'graphql/generated/apolloHelpers'
import {
  Cache_Generate_UserInfo_LiftedPropsFragmentDoc,
  Cache_Generate_UserInfo_LiftedPropsFragment,
  Cache_UserInfo_ViewerPropsQuery,
  Cache_UserInfo_ViewerPropsDocument,
  User,
  Cache_RestLibraryDataFragmentDoc,
  Cache_RestLibraryDataFragment,
  UserHasBeen,
  Cache_UserInfo_LiftedPropsFragment,
  Cache_UserInfo_LiftedPropsFragmentDoc,
  Cache_UserInfo_UserLibDataFragment,
  Cache_UserInfo_UserLibDataFragmentDoc,
} from 'graphql/generated'
import { LibraryDataQuery, LibraryDataQueryVariables } from 'graphql/operations'
import {
  nullish,
  captureException,
  parseJsonIfB64,
  isLibraryData,
} from 'helpers'

const nullOnUndefinedPolicy = {
  read: (existing: unknown): unknown =>
    existing === undefined ? null : existing,
}

export const typePolicies: TypePolicies & StrictTypedTypePolicies = {
  Repository: {
    keyFields: ['nameWithOwner'],
  },
  Issue: {
    keyFields: ['number'],
  },
  UserInfo: {
    keyFields: ['login'],
  },
  User: {
    keyFields: ['login'],
    fields: {
      currentOid: nullOnUndefinedPolicy,
      stargazerCount: nullOnUndefinedPolicy,
      issuesTotalCount: nullOnUndefinedPolicy,
      followingUsers: nullOnUndefinedPolicy,
      followingTags: nullOnUndefinedPolicy,
      saved: nullOnUndefinedPolicy,
      hasBeen: (existing: UserHasBeen = UserHasBeen.Untouched) => existing,
    },
    merge(_, incoming: User, options) {
      const { cache, variables, fieldName } = options

      if (fieldName === 'viewer' || fieldName === 'user') {
        const user =
          cache.readFragment<Cache_Generate_UserInfo_LiftedPropsFragment>({
            id: cache.identify(incoming),
            fragment: Cache_Generate_UserInfo_LiftedPropsFragmentDoc,
            variables,
          })
        const currentOid = user?.repository?.defaultBranchRef?.target
          ?.oid as Maybe<string>
        const stargazerCount = user?.repository?.stargazerCount
        const issuesTotalCount = user?.repository?.issues.totalCount

        if (
          !currentOid ||
          nullish(stargazerCount) ||
          nullish(issuesTotalCount)
        ) {
          captureException({
            inside: 'typePolicies:User',
            msgs: [
              [!currentOid, 'Cannot read currentOid'],
              [nullish(stargazerCount), 'Cannot read stargazerCount'],
              [nullish(issuesTotalCount), 'Cannot read issuesTotalCount'],
            ],
          })
          throw new Error('Cannot populate viewer info')
        }

        cache.writeFragment<Cache_UserInfo_LiftedPropsFragment>({
          id: cache.identify(incoming),
          fragment: Cache_UserInfo_LiftedPropsFragmentDoc,
          data: {
            currentOid,
            stargazerCount,
            issuesTotalCount,
          },
        })
      }

      return incoming
    },
  },
  RestLibraryData: {
    keyFields: ['sha'],
    merge(_, incoming, options) {
      const { cache } = options
      const variables = options.variables as LibraryDataQueryVariables

      const cacheViewer = cache.readQuery<Cache_UserInfo_ViewerPropsQuery>({
        query: Cache_UserInfo_ViewerPropsDocument,
      })
      const isViewer = cacheViewer?.viewer?.login === variables.userLogin

      if (!cacheViewer) {
        const noViewerErr = 'Cannot read viewer data'
        captureException({
          inside: 'typePolicies:RestLibraryData',
          msgs: [noViewerErr],
        })
        throw new Error(noViewerErr)
      }

      if (!isViewer) {
        const userLibraryData =
          cache.readFragment<Cache_RestLibraryDataFragment>({
            id: cache.identify(incoming),
            fragment: Cache_RestLibraryDataFragmentDoc,
          })

        const fileContents = userLibraryData?.content
        if (!fileContents) {
          const noContentErr = 'Cannot read LibraryData file contents'
          captureException({
            inside: 'typePolicies:RestLibraryData',
            msgs: [[!fileContents, noContentErr]],
          })
          throw new Error(noContentErr)
        }

        const libraryData = parseJsonIfB64(fileContents)
        if (!isLibraryData(libraryData)) {
          const parseErr = 'Cannot parse base64 contents'
          captureException({
            inside: 'typePolicies:RestLibraryData',
            msgs: [parseErr],
          })
          throw new Error(parseErr)
        }

        cache.writeFragment<Cache_UserInfo_UserLibDataFragment>({
          id: cache.identify({
            __typename: 'User',
            login: variables.userLogin,
          }),
          fragment: Cache_UserInfo_UserLibDataFragmentDoc,
          data: {
            followingUsers: libraryData.following,
          },
        })
      }

      return incoming as LibraryDataQuery
    },
  },
}
