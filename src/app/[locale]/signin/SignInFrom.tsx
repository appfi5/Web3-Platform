'use client';
import * as Clerk from '@clerk/elements/common';
import * as SignIn from '@clerk/elements/sign-in';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import Image from 'next/image';

import { Button } from '~/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';

import GithubIcon from './github.svg';
import GoogleIcon from './google.svg';

export default function SignInFrom() {
  return (
    <SignIn.Root routing="virtual">
      <Clerk.Loading>
        {(isGlobalLoading) => (
          <>
            <SignIn.Step name="start">
              <Card className="w-full sm:w-96">
                <CardHeader className="flex flex-col justify-center items-center gap-2">
                  <Image alt="logo" height={44} src="/img/logo.svg" width={44} />
                  <CardTitle className="text-base">Sign in to Magickbase</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-y-4">
                  <div className="grid grid-cols-2 gap-x-4">
                    <Clerk.Connection asChild name="google">
                      <Button
                        className="bg-card-content hover:bg-card-content/80 rounded-lg"
                        disabled={isGlobalLoading}
                        size="lg"
                        type="button"
                        variant="ghost"
                      >
                        <Clerk.Loading scope="provider:google">
                          {(isLoading) =>
                            isLoading ? (
                              <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                              <>
                                <GoogleIcon className="mr-2 size-4" />
                                Google
                              </>
                            )
                          }
                        </Clerk.Loading>
                      </Button>
                    </Clerk.Connection>
                    <Clerk.Connection asChild name="github">
                      <Button
                        className="bg-card-content hover:bg-card-content/80 rounded-lg"
                        disabled={isGlobalLoading}
                        size="lg"
                        type="button"
                        variant="ghost"
                      >
                        <Clerk.Loading scope="provider:github">
                          {(isLoading) =>
                            isLoading ? (
                              <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                              <>
                                <GithubIcon className="mr-2 size-4" />
                                GitHub
                              </>
                            )
                          }
                        </Clerk.Loading>
                      </Button>
                    </Clerk.Connection>
                  </div>
                  {/* <p className="flex items-center gap-x-3 text-sm text-muted-foreground before:h-px before:flex-1 before:bg-border after:h-px after:flex-1 after:bg-border">
                    or
                  </p>
                  <Clerk.Field className="space-y-2" name="identifier">
                    <Clerk.Label asChild>
                      <Label className="text-muted-foreground">Email</Label>
                    </Clerk.Label>
                    <Clerk.Input asChild required type="email">
                      <Input className="rounded-[12px]" placeholder="Input Email" />
                    </Clerk.Input>
                    <Clerk.FieldError className="block text-sm text-destructive" />
                  </Clerk.Field> */}
                </CardContent>
                {/* <CardFooter>
                  <div className="grid w-full gap-y-4">
                    <SignIn.Action asChild submit>
                      <Button className="rounded-[12px]" disabled={isGlobalLoading}>
                        <Clerk.Loading>
                          {(isLoading) => {
                            return isLoading ? <LoaderCircle className="size-4 animate-spin" /> : 'Continue';
                          }}
                        </Clerk.Loading>
                      </Button>
                    </SignIn.Action>
                  </div>
                </CardFooter> */}
              </Card>
            </SignIn.Step>

            <SignIn.Step name="verifications">
              <SignIn.Strategy name="email_code">
                <Card className="w-full sm:w-96">
                  <CardHeader className="flex flex-col justify-center items-center gap-2 relative">
                    <SignIn.Action asChild navigate="start">
                      <ArrowLeft className="absolute left-6 top-6 cursor-pointer text-muted-foreground hover:text-foreground" />
                    </SignIn.Action>

                    <Image alt="logo" height={44} src="/img/logo.svg" width={44} />
                    <CardTitle className="text-base">Check your email</CardTitle>

                    <CardDescription>Enter the verification code sent to your email ID</CardDescription>
                    <p className="text-sm text-muted-foreground">
                      <SignIn.SafeIdentifier />
                    </p>
                  </CardHeader>
                  <CardContent className="grid gap-y-4">
                    <Clerk.Field name="code">
                      <Clerk.Label className="sr-only">Email verification code</Clerk.Label>
                      <div className="grid gap-y-2 items-center justify-center">
                        <div className="flex justify-center text-center">
                          <Clerk.Input
                            autoSubmit
                            className="flex justify-center has-[:disabled]:opacity-50 gap-2"
                            render={({ value, status }) => {
                              return (
                                <div
                                  className="relative flex h-12 w-12 items-center justify-center border border-input rounded-[12px] shadow-sm transition-all data-[status=selected]:ring-1 data-[status=selected]:ring-ring data-[status=cursor]:ring-1 data-[status=cursor]:ring-ring"
                                  data-status={status}
                                >
                                  {value}
                                </div>
                              );
                            }}
                            type="otp"
                          />
                        </div>
                        <Clerk.FieldError className="block text-sm text-destructive text-center" />
                        <SignIn.Action
                          asChild
                          className="text-muted-foreground"
                          fallback={({ resendableAfter }) => (
                            <Button disabled size="sm" variant="link">
                              Didn&apos;t receive a code? Resend (
                              <span className="tabular-nums">{resendableAfter}</span>)
                            </Button>
                          )}
                          resend
                        >
                          <Button size="sm" variant="link">
                            Didn&apos;t receive a code? Resend
                          </Button>
                        </SignIn.Action>
                      </div>
                    </Clerk.Field>
                  </CardContent>
                  <CardFooter>
                    <div className="grid w-full gap-y-4">
                      <SignIn.Action asChild submit>
                        <Button disabled={isGlobalLoading}>
                          <Clerk.Loading>
                            {(isLoading) => {
                              return isLoading ? <LoaderCircle className="size-4 animate-spin" /> : 'Continue';
                            }}
                          </Clerk.Loading>
                        </Button>
                      </SignIn.Action>
                    </div>
                  </CardFooter>
                </Card>
              </SignIn.Strategy>
            </SignIn.Step>
          </>
        )}
      </Clerk.Loading>
    </SignIn.Root>
  );
}
