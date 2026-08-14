import { validateFirebaseProject, REQUIRED_PROJECT_ID } from '../../../scripts/assert-firebase-project.mjs'
import process from 'node:process'

export { REQUIRED_PROJECT_ID }

export function getArgValue(args, name) {
  const prefix = `${name}=`
  const inline = args.find((arg) => arg.startsWith(prefix))
  if (inline) return inline.slice(prefix.length)
  const index = args.indexOf(name)
  if (index >= 0) return args[index + 1] || ''
  return ''
}

export function hasFlag(args, name) {
  return args.includes(name)
}

export function assertProjectArg(args) {
  const projectId = getArgValue(args, '--project')
  const result = validateFirebaseProject({
    commandProjectId: projectId,
    expectedProjectId: process.env.EXPECTED_FIREBASE_PROJECT_ID || REQUIRED_PROJECT_ID,
  })

  if (!result.ok) {
    const message = result.errors.join('; ')
    throw new Error(`Firebase project guard failed: ${message}`)
  }

  return projectId
}

export function assertConfirmation(args, expectedToken) {
  if (!hasFlag(args, '--apply')) {
    throw new Error('Write mode requires --apply.')
  }

  const token = getArgValue(args, '--confirm')
  if (token !== expectedToken) {
    throw new Error(`Write mode requires --confirm ${expectedToken}.`)
  }
}
